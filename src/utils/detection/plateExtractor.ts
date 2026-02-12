import type { DetectionBox, OCRResult } from '../../types';
import { cropCanvas } from '../canvas/canvasUtils';
import { globalOCREngine } from '../ocr/ocrEngine';

/**
 * Performs OCR on a canvas image
 * 
 * @param canvas - Canvas containing the image to recognize
 * @returns OCR result with text and confidence
 */
const performOCR = async (canvas: HTMLCanvasElement): Promise<OCRResult> => {
  try {
    const result = await globalOCREngine.recognize(canvas);
    if (result.text) {
      console.log(`✓ OCR: "${result.text}" (${result.confidence.toFixed(1)}%)`);
    }
    return result;
  } catch (error) {
    console.error('OCR failed:', error);
    return { text: '', confidence: 0 };
  }
};

/**
 * Extracts and recognizes a license plate from a detection box
 * 
 * Pipeline:
 * 1. Crop the detected region from the canvas
 * 2. Run OCR on the cropped image
 * 3. Return the box with OCR results attached
 * 
 * @param box - Detection box to extract and recognize
 * @param canvas - Canvas containing the full image
 * @returns Detection box with text and confidence populated
 */
const processLicensePlate = async (
  box: DetectionBox,
  canvas: HTMLCanvasElement
): Promise<DetectionBox> => {
  const croppedCanvas = cropCanvas(canvas, box.bounding);
  
  // Log cropped license plate image for debugging
  console.debug('Cropped plate:', croppedCanvas.toDataURL('image/png'));
  
  const ocrResult = await performOCR(croppedCanvas);
  
  return {
    ...box,
    text: ocrResult.text,
    confidence: ocrResult.confidence,
  };
};

/**
 * Extracts and recognizes license plates from multiple detection boxes
 * 
 * Processes sequentially (not in parallel) to avoid "Session already started" errors.
 * ONNX Runtime sessions cannot handle concurrent run() calls.
 * 
 * @param boxes - Array of detection boxes to process
 * @param canvas - Canvas containing the full image
 * @returns Array of boxes with OCR results
 */
export const extractLicensePlates = async (
  boxes: readonly DetectionBox[],
  canvas: HTMLCanvasElement
): Promise<DetectionBox[]> => {
  const results: DetectionBox[] = [];
  
  // Process sequentially to avoid ONNX session conflicts
  for (const box of boxes) {
    const result = await processLicensePlate(box, canvas);
    results.push(result);
  }
  
  return results;
};
