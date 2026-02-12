import type { DetectionBox, Session } from "../types";
import { detectObjects } from "./detection/yoloDetection";
import { extractLicensePlates } from "./detection/plateExtractor";
import { createCanvas, drawToCanvas } from "./canvas/canvasUtils";

/**
 * License Plate Detection and Recognition Pipeline
 * 
 * Simplified orchestration function that combines:
 * 1. YOLO detection (via detectObjects)
 * 2. OCR recognition (via extractLicensePlates)
 * 
 * Note: This function does NOT render boxes - rendering is handled separately
 * by usePlateScanner to avoid duplicate rendering.
 * 
 * @param image - Image or video element to detect plates in
 * @param canvas - Canvas for OCR processing (not for rendering)
 * @param session - ONNX Runtime session with loaded YOLO model
 * @param iouThreshold - NMS IoU threshold (e.g., 0.3)
 * @param scoreThreshold - Minimum confidence threshold (e.g., 0.25)
 * @param inputShape - Model input shape [batch, channels, height, width]
 * @returns Array of detected boxes with OCR results
 */
export const detectImageSimple = async (
  image: HTMLImageElement | HTMLVideoElement,
  canvas: HTMLCanvasElement,
  session: Session,
  iouThreshold: number,
  scoreThreshold: number,
  inputShape: readonly number[]
): Promise<DetectionBox[]> => {
  // Step 1: Detect license plate bounding boxes
  const boxes = await detectObjects(
    image,
    session,
    scoreThreshold,
    iouThreshold,
    inputShape
  );

  if (boxes.length === 0) {
    return [];
  }

  // Step 2: Create a temporary canvas with the full frame for OCR cropping
  const tempCanvas = createCanvas(canvas.width, canvas.height);
  drawToCanvas(image, tempCanvas);

  // Step 3: Extract and recognize license plates
  const boxesWithOCR = await extractLicensePlates(boxes, tempCanvas);

  return boxesWithOCR;
};
