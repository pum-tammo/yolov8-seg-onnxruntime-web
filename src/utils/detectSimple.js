import cv from "@techstark/opencv-js";
import { Tensor } from "onnxruntime-web";
import { renderBoxes, Colors } from "./renderBox";
import labels from "./labels.json";

const colors = new Colors();

/**
 * Simple Detection (without segmentation)
 * @param {HTMLImageElement} image Image to detect
 * @param {HTMLCanvasElement} canvas canvas to draw boxes
 * @param {ort.InferenceSession} session YOLO onnxruntime session
 * @param {Number} iouThreshold Float representing the threshold for deciding whether boxes overlap too much with respect to IOU
 * @param {Number} scoreThreshold Float representing the threshold for deciding when to remove boxes based on score
 * @param {Number[]} inputShape model input shape. Normally in YOLO model [batch, channels, width, height]
 */
export const detectImageSimple = async (
  image,
  canvas,
  session,
  iouThreshold,
  scoreThreshold,
  inputShape
) => {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); // clean canvas

  const [modelWidth, modelHeight] = inputShape.slice(2);
  const [input, xRatio, yRatio] = preprocessing(image, modelWidth, modelHeight);

  const tensor = new Tensor("float32", input.data32F, inputShape);
  const output = await session.net.run({ images: tensor });

  const output0 = output[Object.keys(output)[0]];
  const boxes = [];
  const [, numFeatures, numDetections] = output0.dims;

  // Data layout: [batch, features, detections]
  // features = [x, y, w, h, confidence]
  // All x values, then all y values, etc.
  
  // Process detections
  for (let i = 0; i < numDetections; i++) {
    const x = output0.data[i];
    const y = output0.data[numDetections + i];
    const w = output0.data[2 * numDetections + i];
    const h = output0.data[3 * numDetections + i];
    const confidence = output0.data[4 * numDetections + i];

    if (confidence > scoreThreshold) {
      const color = colors.get(0);

      // Model coordinates are relative to the padded input
      // Scale back to original image dimensions
      const x1 = Math.max(0, Math.floor((x - w / 2) * xRatio));
      const y1 = Math.max(0, Math.floor((y - h / 2) * yRatio));
      const width = Math.floor(w * xRatio);
      const height = Math.floor(h * yRatio);

      boxes.push({
        label: labels[0] || "license-plate",
        probability: confidence,
        color: color,
        bounding: [x1, y1, width, height],
      });
    }
  }

  // Simple NMS in JavaScript
  const selectedBoxes = nonMaxSuppression(boxes, iouThreshold);

  // Draw on canvas
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  renderBoxes(ctx, selectedBoxes);

  input.delete();
};

/**
 * Non-Maximum Suppression
 */
function nonMaxSuppression(boxes, iouThreshold) {
  if (boxes.length === 0) return [];

  // Sort by probability
  boxes.sort((a, b) => b.probability - a.probability);

  const selected = [];
  const suppressed = new Set();

  for (let i = 0; i < boxes.length; i++) {
    if (suppressed.has(i)) continue;

    selected.push(boxes[i]);

    for (let j = i + 1; j < boxes.length; j++) {
      if (suppressed.has(j)) continue;

      const iou = calculateIoU(boxes[i].bounding, boxes[j].bounding);
      if (iou > iouThreshold) {
        suppressed.add(j);
      }
    }
  }

  return selected;
}

/**
 * Calculate Intersection over Union
 */
function calculateIoU(box1, box2) {
  const [x1, y1, w1, h1] = box1;
  const [x2, y2, w2, h2] = box2;

  const xA = Math.max(x1, x2);
  const yA = Math.max(y1, y2);
  const xB = Math.min(x1 + w1, x2 + w2);
  const yB = Math.min(y1 + h1, y2 + h2);

  const intersectionArea = Math.max(0, xB - xA) * Math.max(0, yB - yA);
  const box1Area = w1 * h1;
  const box2Area = w2 * h2;
  const unionArea = box1Area + box2Area - intersectionArea;

  return intersectionArea / unionArea;
}

/**
 * Preprocessing image
 */
const preprocessing = (source, modelWidth, modelHeight) => {
  const mat = cv.imread(source);
  const matC3 = new cv.Mat(mat.rows, mat.cols, cv.CV_8UC3);
  cv.cvtColor(mat, matC3, cv.COLOR_RGBA2BGR);

  const originalWidth = mat.cols;
  const originalHeight = mat.rows;

  // Calculate scaling to maintain aspect ratio
  const scale = Math.min(modelWidth / matC3.cols, modelHeight / matC3.rows);
  const newWidth = Math.floor(matC3.cols * scale);
  const newHeight = Math.floor(matC3.rows * scale);

  cv.resize(matC3, matC3, new cv.Size(newWidth, newHeight));

  // Padding
  const matPad = new cv.Mat();
  const top = 0;
  const bottom = modelHeight - newHeight;
  const left = 0;
  const right = modelWidth - newWidth;
  
  cv.copyMakeBorder(matC3, matPad, top, bottom, left, right, cv.BORDER_CONSTANT);

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

  // Return the inverse of the scale to convert from model coords to original coords
  const xRatio = originalWidth / newWidth;
  const yRatio = originalHeight / newHeight;

  return [input, xRatio, yRatio];
};
