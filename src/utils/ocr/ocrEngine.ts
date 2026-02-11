import { InferenceSession, Tensor } from 'onnxruntime-web';
import { PlateOCRConfig, GLOBAL_PLATE_OCR_CONFIG } from './plateOCRConfig';

export interface OCRResult {
  text: string;
  confidence: number;
}

export class PlateOCREngine {
  private session: InferenceSession | null = null;
  private config: PlateOCRConfig;

  constructor(config: PlateOCRConfig = GLOBAL_PLATE_OCR_CONFIG) {
    this.config = config;
  }

  async initialize(modelPath: string): Promise<void> {
    try {
      this.session = await InferenceSession.create(modelPath, {
        executionProviders: ['webgl', 'wasm'],
      });
      console.log('OCR model loaded successfully');
    } catch (error) {
      console.error('Failed to load OCR model:', error);
      throw error;
    }
  }

  private preprocessImage(canvas: HTMLCanvasElement): Uint8Array {
    const { imgWidth, imgHeight } = this.config;
    
    const resizeCanvas = document.createElement('canvas');
    resizeCanvas.width = imgWidth;
    resizeCanvas.height = imgHeight;
    const resizeCtx = resizeCanvas.getContext('2d');
    
    if (!resizeCtx) {
      throw new Error('Failed to get canvas context');
    }

    resizeCtx.imageSmoothingEnabled = true;
    resizeCtx.imageSmoothingQuality = 'high';
    resizeCtx.drawImage(canvas, 0, 0, imgWidth, imgHeight);

    const imageData = resizeCtx.getImageData(0, 0, imgWidth, imgHeight);
    const { data } = imageData;

    // Convert to Grayscale: 0.299*R + 0.587*G + 0.114*B
    const grayData = new Uint8Array(imgHeight * imgWidth);
    
    for (let i = 0; i < data.length / 4; i++) {
      const r = data[i * 4];
      const g = data[i * 4 + 1];
      const b = data[i * 4 + 2];
      grayData[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    }

    return grayData;
  }

  /**
   * Postprocess model output to text
   * Takes logits [1, maxPlateSlots, vocabularySize] and returns decoded text
   */
  private postprocessOutput(output: Float32Array): OCRResult {
    const { maxPlateSlots, alphabet, padChar } = this.config;
    const vocabularySize = alphabet.length;

    let text = '';
    let totalConfidence = 0;

    // For each character position
    for (let slot = 0; slot < maxPlateSlots; slot++) {
      let maxProb = -Infinity;
      let maxIdx = 0;

      // Find character with highest probability
      for (let charIdx = 0; charIdx < vocabularySize; charIdx++) {
        const prob = output[slot * vocabularySize + charIdx];
        if (prob > maxProb) {
          maxProb = prob;
          maxIdx = charIdx;
        }
      }

      const char = alphabet[maxIdx];
      
      // Skip padding characters
      if (char !== padChar) {
        text += char;
      }

      // Accumulate confidence (using softmax approximation - max value)
      totalConfidence += maxProb;
    }

    // Average confidence
    const confidence = totalConfidence / maxPlateSlots;

    return {
      text: text.trim(),
      confidence: Number((confidence * 100).toFixed(2)),
    };
  }

  /**
   * Run OCR on a cropped license plate image
   */
  async recognize(canvas: HTMLCanvasElement): Promise<OCRResult> {
    if (!this.session) {
      throw new Error('OCR model not initialized. Call initialize() first.');
    }

    try {
      // Preprocess image
      const grayData = this.preprocessImage(canvas);

      // Create input tensor [1, height, width, 1]
      const inputTensor = new Tensor('uint8', grayData, [
        1,
        this.config.imgHeight,
        this.config.imgWidth,
        1,
      ]);

      // Run inference
      const feeds = { input: inputTensor };
      const results = await this.session.run(feeds);

      // Get output
      const outputName = this.session.outputNames[0];
      const output = results[outputName];

      // Postprocess
      return this.postprocessOutput(output.data as Float32Array);
    } catch (error) {
      console.error('OCR recognition failed:', error);
      return {
        text: '',
        confidence: 0,
      };
    }
  }

  /**
   * Check if model is ready
   */
  isReady(): boolean {
    return this.session !== null;
  }
}

// Singleton instance
export const globalOCREngine = new PlateOCREngine();
