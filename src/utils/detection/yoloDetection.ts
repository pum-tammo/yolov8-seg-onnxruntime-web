import { Tensor } from 'onnxruntime-web';
import type { DetectionBox, BoundingBox, Session } from '../../types';
import { preprocessImage, type PreprocessingResult } from './preprocessing';
import { nonMaxSuppression } from './nms';
import { Colors } from '../renderBox';

const colors = new Colors();

/**
 * Creates a DetectionBox from raw YOLO output coordinates
 * 
 * @param x - Center x coordinate
 * @param y - Center y coordinate
 * @param w - Width
 * @param h - Height
 * @param confidence - Detection confidence score
 * @param xRatio - Scale ratio for x-coordinates
 * @param yRatio - Scale ratio for y-coordinates
 * @returns DetectionBox with scaled coordinates
 */
const createBox = (
  x: number,
  y: number,
  w: number,
  h: number,
  confidence: number,
  xRatio: number,
  yRatio: number
): DetectionBox => {
  // Convert center coordinates to top-left corner
  const x1 = Math.max(0, Math.floor((x - w / 2) * xRatio));
  const y1 = Math.max(0, Math.floor((y - h / 2) * yRatio));
  const width = Math.floor(w * xRatio);
  const height = Math.floor(h * yRatio);

  return {
    label: 'license-plate',
    probability: confidence,
    color: colors.get(0),
    bounding: [x1, y1, width, height] as BoundingBox,
  };
};

/**
 * Processes YOLO model output tensor into DetectionBox array
 * 
 * YOLO output format: [batch, 5 + num_classes, num_detections]
 * For each detection:
 * - Index 0: x center
 * - Index 1: y center
 * - Index 2: width
 * - Index 3: height
 * - Index 4: confidence score
 * 
 * @param output - YOLO model output tensor
 * @param scoreThreshold - Minimum confidence threshold
 * @param xRatio - Scale ratio for x-coordinates
 * @param yRatio - Scale ratio for y-coordinates
 * @returns Array of detection boxes above threshold
 */
const processDetections = (
  output: Tensor,
  scoreThreshold: number,
  xRatio: number,
  yRatio: number
): DetectionBox[] => {
  const [, , numDetections] = output.dims;
  const boxes: DetectionBox[] = [];

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

/**
 * Performs YOLO object detection on an image or video frame
 * 
 * Pipeline:
 * 1. Preprocess image (resize, normalize, convert to tensor)
 * 2. Run YOLO inference
 * 3. Process output detections
 * 4. Apply Non-Maximum Suppression (NMS)
 * 
 * @param source - Image or video element to detect objects in
 * @param session - ONNX Runtime session with loaded YOLO model
 * @param scoreThreshold - Minimum confidence threshold (e.g., 0.25)
 * @param iouThreshold - NMS IoU threshold (e.g., 0.3)
 * @param inputShape - Model input shape [batch, channels, height, width]
 * @returns Array of detected boxes after NMS, without OCR results
 */
export const detectObjects = async (
  source: HTMLImageElement | HTMLVideoElement,
  session: Session,
  scoreThreshold: number,
  iouThreshold: number,
  inputShape: readonly number[]
): Promise<DetectionBox[]> => {
  // Step 1: Preprocess
  const [modelWidth, modelHeight] = inputShape.slice(2);
  const { input, xRatio, yRatio }: PreprocessingResult = preprocessImage(
    source,
    modelWidth,
    modelHeight
  );

  // Step 2: Create tensor and run inference
  const tensor = new Tensor('float32', input.data32F, inputShape);
  const output = await session.net.run({ images: tensor });

  // Step 3: Process detections
  const output0 = output[Object.keys(output)[0]];
  const boxes = processDetections(output0, scoreThreshold, xRatio, yRatio);

  // Step 4: Apply NMS
  const selectedBoxes = nonMaxSuppression(boxes, iouThreshold);

  // Cleanup OpenCV Mat
  input.delete();

  return selectedBoxes;
};
