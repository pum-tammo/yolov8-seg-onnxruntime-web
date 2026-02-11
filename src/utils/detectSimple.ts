import { Tensor, InferenceSession } from "onnxruntime-web";
import { renderBoxes, Colors } from "./renderBox";
import labels from "./labels.json";
import Tesseract from 'tesseract.js';

// ============================================================
// TYPES
// ============================================================

interface Box {
  label: string;
  probability: number;
  color: string;
  bounding: [number, number, number, number];
}

interface Session {
  net: InferenceSession;
}

interface OCRResult {
  text: string;
  confidence: number;
  method: string;
}

interface PreprocessVariant {
  name: string;
  canvas: HTMLCanvasElement;
  psm: Tesseract.PSM;
}

// ============================================================
// CONSTANTS & HELPERS
// ============================================================

const colors = new Colors();
const getCV = () => (window as any).cv;

// ============================================================
// IMAGE PREPROCESSING
// ============================================================

const toGrayscale = (data: Uint8ClampedArray): void => {
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    data[i] = data[i + 1] = data[i + 2] = gray;
  }
};

const scaleImage = (source: HTMLCanvasElement, scale: number): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = source.width * scale;
  canvas.height = source.height * scale;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return source;
  
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  
  return canvas;
};

const sharpenImage = (source: HTMLCanvasElement, scale: number): HTMLCanvasElement => {
  const scaled = scaleImage(source, scale);
  const ctx = scaled.getContext('2d');
  if (!ctx) return scaled;
  
  const imageData = ctx.getImageData(0, 0, scaled.width, scaled.height);
  const { data, width, height } = imageData;
  
  toGrayscale(data);
  
  const tempData = new Uint8ClampedArray(data);
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      const center = tempData[idx];
      const neighbors = [
        tempData[((y - 1) * width + x) * 4],
        tempData[((y + 1) * width + x) * 4],
        tempData[(y * width + (x - 1)) * 4],
        tempData[(y * width + (x + 1)) * 4]
      ];
      
      const sharpened = 5 * center - neighbors.reduce((sum, val) => sum + val, 0);
      const clamped = Math.max(0, Math.min(255, sharpened));
      
      data[idx] = data[idx + 1] = data[idx + 2] = clamped;
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
  return scaled;
};

const calculateLocalAverage = (
  grayData: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  offset: number
): number => {
  let sum = 0;
  let count = 0;
  
  const yMin = Math.max(0, y - offset);
  const yMax = Math.min(height, y + offset + 1);
  const xMin = Math.max(0, x - offset);
  const xMax = Math.min(width, x + offset + 1);
  
  for (let wy = yMin; wy < yMax; wy++) {
    for (let wx = xMin; wx < xMax; wx++) {
      sum += grayData[wy * width + wx];
      count++;
    }
  }
  
  return sum / count;
};

const adaptiveThreshold = (source: HTMLCanvasElement, scale: number): HTMLCanvasElement => {
  const scaled = scaleImage(source, scale);
  const ctx = scaled.getContext('2d');
  if (!ctx) return scaled;
  
  const imageData = ctx.getImageData(0, 0, scaled.width, scaled.height);
  const { data, width, height } = imageData;
  
  const grayData = new Uint8ClampedArray(width * height);
  for (let i = 0; i < data.length; i += 4) {
    grayData[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  
  const windowSize = 15;
  const offset = Math.floor(windowSize / 2);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const localAvg = calculateLocalAverage(grayData, width, height, x, y, offset);
      const idx = (y * width + x) * 4;
      const value = grayData[y * width + x] > localAvg - 10 ? 255 : 0;
      data[idx] = data[idx + 1] = data[idx + 2] = value;
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
  return scaled;
};

const createPreprocessVariants = (canvas: HTMLCanvasElement): PreprocessVariant[] => [
  { name: 'Scaled 4x', canvas: scaleImage(canvas, 4), psm: Tesseract.PSM.SINGLE_WORD },
  { name: 'Scaled 4x (SINGLE_LINE)', canvas: scaleImage(canvas, 4), psm: Tesseract.PSM.SINGLE_LINE },
  { name: 'Sharpened', canvas: sharpenImage(canvas, 4), psm: Tesseract.PSM.SINGLE_WORD },
  { name: 'Adaptive Threshold', canvas: adaptiveThreshold(canvas, 4), psm: Tesseract.PSM.SINGLE_WORD }
];

// ============================================================
// OCR & TEXT PROCESSING
// ============================================================

const cleanText = (text: string): string => 
  text.toUpperCase().replace(/[^A-Z0-9]/g, '').trim();

const calculateQualityScore = (text: string, confidence: number): number => {
  const lengthScore = text.length * 10;
  const hasLeadingError = /^[I1J]/.test(text);
  const qualityPenalty = hasLeadingError ? -20 : 0;
  return lengthScore + confidence + qualityPenalty;
};

const recognizeText = async (variant: PreprocessVariant): Promise<OCRResult> => {
  console.log(`\nTrying method: ${variant.name}`);
  console.log('Image:', variant.canvas.toDataURL('image/png'));
  
  const result = await Tesseract.recognize(
    variant.canvas,
    'eng',
    {
      logger: (m: any) => {
        if (m.status === 'recognizing text') {
          console.log(`  OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      },
      tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      tessedit_pageseg_mode: variant.psm,
    } as any
  );
  
  const rawText = result.data.text.trim();
  const text = cleanText(rawText);
  const confidence = result.data.confidence;
  
  console.log(`  Raw: "${rawText}" | Cleaned: "${text}" | Conf: ${confidence.toFixed(2)}%`);
  
  return { text, confidence, method: variant.name };
};

const selectBestResult = (results: OCRResult[]): OCRResult => {
  const validResults = results.filter(r => r.text.length > 0);
  
  if (validResults.length === 0) {
    return { text: '', confidence: 0, method: 'none' };
  }
  
  return validResults.reduce((best, current) => {
    const bestScore = calculateQualityScore(best.text, best.confidence);
    const currentScore = calculateQualityScore(current.text, current.confidence);
    return currentScore > bestScore ? current : best;
  });
};

const performOCR = async (canvas: HTMLCanvasElement): Promise<OCRResult> => {
  const variants = createPreprocessVariants(canvas);
  
  const results = await Promise.all(
    variants.map(variant => 
      recognizeText(variant).catch(error => {
        console.error(`  Error with ${variant.name}:`, error);
        return { text: '', confidence: 0, method: variant.name };
      })
    )
  );
  
  return selectBestResult(results);
};

// ============================================================
// LICENSE PLATE EXTRACTION
// ============================================================

const cropBox = (canvas: HTMLCanvasElement, box: Box): HTMLCanvasElement => {
  const [x, y, width, height] = box.bounding;
  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = width;
  cropCanvas.height = height;
  
  const ctx = cropCanvas.getContext('2d');
  if (!ctx) return cropCanvas;
  
  ctx.drawImage(canvas, x, y, width, height, 0, 0, width, height);
  return cropCanvas;
};

const processLicensePlate = async (box: Box, canvas: HTMLCanvasElement, index: number): Promise<void> => {
  const cropCanvas = cropBox(canvas, box);
  const dataUrl = cropCanvas.toDataURL('image/png');
  
  console.log(`License Plate ${index + 1} (${box.probability.toFixed(3)} confidence):`);
  console.log(dataUrl);
  console.log(`To view: Open a new tab and paste the data URL above into the address bar`);
  
  const bestResult = await performOCR(cropCanvas);
  
  console.log(`\n✓ Best Result: "${bestResult.text}" (${bestResult.confidence.toFixed(2)}%, ${bestResult.method})`);
  console.log('---');
};

const extractLicensePlateCrops = async (boxes: Box[], canvas: HTMLCanvasElement): Promise<void> => {
  await Promise.all(
    boxes.map((box, index) => processLicensePlate(box, canvas, index))
  );
};

// ============================================================
// BOX DETECTION & NMS
// ============================================================

const calculateIoU = (box1: [number, number, number, number], box2: [number, number, number, number]): number => {
  const [x1, y1, w1, h1] = box1;
  const [x2, y2, w2, h2] = box2;

  const xA = Math.max(x1, x2);
  const yA = Math.max(y1, y2);
  const xB = Math.min(x1 + w1, x2 + w2);
  const yB = Math.min(y1 + h1, y2 + h2);

  const intersectionArea = Math.max(0, xB - xA) * Math.max(0, yB - yA);
  const unionArea = w1 * h1 + w2 * h2 - intersectionArea;

  return intersectionArea / unionArea;
};

const nonMaxSuppression = (boxes: Box[], iouThreshold: number): Box[] => {
  if (boxes.length === 0) return [];

  const sortedBoxes = [...boxes].sort((a, b) => b.probability - a.probability);
  const selected: Box[] = [];
  const suppressed = new Set<number>();

  sortedBoxes.forEach((box, i) => {
    if (suppressed.has(i)) return;

    selected.push(box);

    sortedBoxes.slice(i + 1).forEach((otherBox, j) => {
      const otherIndex = i + j + 1;
      if (suppressed.has(otherIndex)) return;

      const iou = calculateIoU(box.bounding, otherBox.bounding);
      if (iou > iouThreshold) {
        suppressed.add(otherIndex);
      }
    });
  });

  return selected;
};

const createBox = (
  x: number,
  y: number,
  w: number,
  h: number,
  confidence: number,
  xRatio: number,
  yRatio: number
): Box => {
  const x1 = Math.max(0, Math.floor((x - w / 2) * xRatio));
  const y1 = Math.max(0, Math.floor((y - h / 2) * yRatio));
  const width = Math.floor(w * xRatio);
  const height = Math.floor(h * yRatio);

  return {
    label: labels[0] || "license-plate",
    probability: confidence,
    color: colors.get(0),
    bounding: [x1, y1, width, height],
  };
};

const processDetections = (
  output: any,
  scoreThreshold: number,
  xRatio: number,
  yRatio: number
): Box[] => {
  const [, , numDetections] = output.dims;
  const boxes: Box[] = [];

  for (let i = 0; i < numDetections; i++) {
    const x = output.data[i] as number;
    const y = output.data[numDetections + i] as number;
    const w = output.data[2 * numDetections + i] as number;
    const h = output.data[3 * numDetections + i] as number;
    const confidence = output.data[4 * numDetections + i] as number;

    if (confidence > scoreThreshold) {
      boxes.push(createBox(x, y, w, h, confidence, xRatio, yRatio));
    }
  }

  return boxes;
};

// ============================================================
// YOLO PREPROCESSING
// ============================================================

const preprocessing = (
  source: HTMLImageElement,
  modelWidth: number,
  modelHeight: number
): [any, number, number] => {
  const cv = getCV();
  const mat = cv.imread(source);
  const matC3 = new cv.Mat(mat.rows, mat.cols, cv.CV_8UC3);
  cv.cvtColor(mat, matC3, cv.COLOR_RGBA2BGR);

  const { cols: originalWidth, rows: originalHeight } = mat;
  const scale = Math.min(modelWidth / matC3.cols, modelHeight / matC3.rows);
  const newWidth = Math.floor(matC3.cols * scale);
  const newHeight = Math.floor(matC3.rows * scale);

  cv.resize(matC3, matC3, new cv.Size(newWidth, newHeight));

  const matPad = new cv.Mat();
  cv.copyMakeBorder(
    matC3,
    matPad,
    0,
    modelHeight - newHeight,
    0,
    modelWidth - newWidth,
    cv.BORDER_CONSTANT
  );

  const input = cv.blobFromImage(
    matPad,
    1 / 255.0,
    new cv.Size(modelWidth, modelHeight),
    new cv.Scalar(0, 0, 0),
    true,
    false
  );

  mat.delete();
  matC3.delete();
  matPad.delete();

  return [input, originalWidth / newWidth, originalHeight / newHeight];
};

// ============================================================
// MAIN DETECTION PIPELINE
// ============================================================

/**
 * Simple Detection (without segmentation)
 * @param image Image to detect
 * @param canvas canvas to draw boxes
 * @param session YOLO onnxruntime session
 * @param iouThreshold Float representing the threshold for deciding whether boxes overlap too much with respect to IOU
 * @param scoreThreshold Float representing the threshold for deciding when to remove boxes based on score
 * @param inputShape model input shape. Normally in YOLO model [batch, channels, width, height]
 */
export const detectImageSimple = async (
  image: HTMLImageElement,
  canvas: HTMLCanvasElement,
  session: Session,
  iouThreshold: number,
  scoreThreshold: number,
  inputShape: number[]
): Promise<void> => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const [modelWidth, modelHeight] = inputShape.slice(2);
  const [input, xRatio, yRatio] = preprocessing(image, modelWidth, modelHeight);

  const tensor = new Tensor("float32", input.data32F, inputShape);
  const output = await session.net.run({ images: tensor });

  const output0 = output[Object.keys(output)[0]];
  const boxes = processDetections(output0, scoreThreshold, xRatio, yRatio);
  const selectedBoxes = nonMaxSuppression(boxes, iouThreshold);

  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  renderBoxes(ctx, selectedBoxes);

  await extractLicensePlateCrops(selectedBoxes, canvas);

  input.delete();
};
