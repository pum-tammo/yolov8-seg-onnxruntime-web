import { getOpenCV } from '../opencvService';
import { videoToCanvas } from '../canvas/canvasUtils';

/**
 * Preprocessing result containing the prepared input tensor and scale ratios
 */
export interface PreprocessingResult {
  /** OpenCV Mat containing the preprocessed image as a blob */
  input: any; // cv.Mat type from OpenCV.js
  /** Scale ratio for x-coordinates (original width / resized width) */
  xRatio: number;
  /** Scale ratio for y-coordinates (original height / resized height) */
  yRatio: number;
}

/**
 * Preprocesses an image or video frame for YOLO inference
 * 
 * Pipeline:
 * 1. Convert video to canvas if needed (OpenCV can't read video directly)
 * 2. Read image as OpenCV Mat
 * 3. Convert RGBA to BGR (YOLO expects BGR)
 * 4. Calculate letterbox padding to maintain aspect ratio
 * 5. Resize and pad image to model input size
 * 6. Convert to blob (normalized float32 tensor)
 * 
 * @param source - Image or video element to preprocess
 * @param modelWidth - Model input width (e.g., 640)
 * @param modelHeight - Model input height (e.g., 640)
 * @returns Preprocessing result with input blob and scale ratios
 */
export const preprocessImage = (
  source: HTMLImageElement | HTMLVideoElement,
  modelWidth: number,
  modelHeight: number
): PreprocessingResult => {
  const cv = getOpenCV();
  
  // Convert video to canvas first (OpenCV limitation)
  const sourceElement = source instanceof HTMLVideoElement 
    ? videoToCanvas(source)
    : source;
  
  // Read image as OpenCV Mat
  const mat = cv.imread(sourceElement);
  const matC3 = new cv.Mat(mat.rows, mat.cols, cv.CV_8UC3);
  cv.cvtColor(mat, matC3, cv.COLOR_RGBA2BGR);

  // Calculate letterbox scaling to maintain aspect ratio
  const { cols: originalWidth, rows: originalHeight } = mat;
  const scale = Math.min(modelWidth / matC3.cols, modelHeight / matC3.rows);
  const newWidth = Math.floor(matC3.cols * scale);
  const newHeight = Math.floor(matC3.rows * scale);

  // Resize image
  cv.resize(matC3, matC3, new cv.Size(newWidth, newHeight));

  // Add padding to reach model input size (letterbox)
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

  // Convert to blob (normalized float32 tensor)
  const input = cv.blobFromImage(
    matPad,
    1 / 255.0, // Normalize to [0, 1]
    new cv.Size(modelWidth, modelHeight),
    new cv.Scalar(0, 0, 0),
    true, // swapRB (BGR to RGB for YOLO)
    false // crop
  );

  // Cleanup OpenCV Mats
  mat.delete();
  matC3.delete();
  matPad.delete();

  // Return scale ratios to map predictions back to original image coordinates
  return {
    input,
    xRatio: originalWidth / newWidth,
    yRatio: originalHeight / newHeight,
  };
};
