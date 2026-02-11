import { Tensor, InferenceSession } from "onnxruntime-web";
import { renderBoxes, Colors } from "./renderBox";
import labels from "./labels.json";
import { globalOCREngine, type OCRResult } from "./ocr/ocrEngine";

// ============================================================
// TYPES
// ============================================================

interface Box {
  label: string;
  probability: number;
  color: string;
  bounding: [number, number, number, number];
  text?: string;
  confidence?: number;
}

interface Session {
  net: InferenceSession;
}



// ============================================================
// CONSTANTS & HELPERS
// ============================================================

const colors = new Colors();
const getCV = () => (window as any).cv;

// ============================================================
// OCR PROCESSING
// ============================================================

const performOCR = async (canvas: HTMLCanvasElement): Promise<OCRResult> => {
  try {
    // Use ONNX OCR Engine
    const result = await globalOCREngine.recognize(canvas);
    console.log(`OCR Result: "${result.text}" (Confidence: ${result.confidence}%)`);
    return result;
  } catch (error) {
    console.error('OCR failed:', error);
    return { text: '', confidence: 0 };
  }
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

const processLicensePlate = async (box: Box, canvas: HTMLCanvasElement, index: number): Promise<Box> => {
  const cropCanvas = cropBox(canvas, box);
  
  console.log(`\nLicense Plate ${index + 1}:`);
  console.log(`  Detection Confidence: ${(box.probability * 100).toFixed(1)}%`);
  
  // Perform OCR
  const ocrResult = await performOCR(cropCanvas);
  
  // Add OCR result to box
  box.text = ocrResult.text;
  box.confidence = ocrResult.confidence;
  
  if (ocrResult.text) {
    console.log(`  ✓ Recognized Text: "${ocrResult.text}"`);
    console.log(`  OCR Confidence: ${ocrResult.confidence}%`);
  } else {
    console.log(`  ✗ No text recognized`);
  }
  console.log('---');
  
  return box;
};

const extractLicensePlateCrops = async (boxes: Box[], canvas: HTMLCanvasElement): Promise<Box[]> => {
  // Process all boxes and add OCR results
  const processedBoxes = await Promise.all(
    boxes.map((box, index) => processLicensePlate(box, canvas, index))
  );
  return processedBoxes;
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

  // Extract and recognize license plates
  const boxesWithOCR = await extractLicensePlateCrops(selectedBoxes, canvas);

  // Re-render with OCR results
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  renderBoxes(ctx, boxesWithOCR);

  input.delete();
};
