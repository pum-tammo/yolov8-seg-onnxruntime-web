import type { BoundingBox, DetectionBox } from '../../types';

/**
 * Calculates Intersection over Union (IoU) between two bounding boxes
 * 
 * IoU = Area of Intersection / Area of Union
 * Used to determine if two boxes overlap significantly
 * 
 * @param box1 - First bounding box [x, y, width, height]
 * @param box2 - Second bounding box [x, y, width, height]
 * @returns IoU value between 0 (no overlap) and 1 (perfect overlap)
 */
export const calculateIoU = (box1: BoundingBox, box2: BoundingBox): number => {
  const [x1, y1, w1, h1] = box1;
  const [x2, y2, w2, h2] = box2;

  // Calculate intersection coordinates
  const xA = Math.max(x1, x2);
  const yA = Math.max(y1, y2);
  const xB = Math.min(x1 + w1, x2 + w2);
  const yB = Math.min(y1 + h1, y2 + h2);

  // Calculate areas
  const intersectionArea = Math.max(0, xB - xA) * Math.max(0, yB - yA);
  const unionArea = w1 * h1 + w2 * h2 - intersectionArea;

  return intersectionArea / unionArea;
};

/**
 * Non-Maximum Suppression (NMS) algorithm
 * 
 * Removes duplicate/overlapping detections by keeping only the highest confidence boxes
 * and suppressing boxes with high IoU overlap.
 * 
 * Algorithm:
 * 1. Sort boxes by confidence (highest first)
 * 2. Take the highest confidence box and keep it
 * 3. Suppress (remove) all boxes with IoU > threshold relative to the kept box
 * 4. Repeat for remaining boxes
 * 
 * @param boxes - Array of detection boxes to filter
 * @param iouThreshold - IoU threshold for suppression (typically 0.3-0.5)
 * @returns Filtered array of non-overlapping boxes
 */
export const nonMaxSuppression = (
  boxes: readonly DetectionBox[],
  iouThreshold: number
): DetectionBox[] => {
  if (boxes.length === 0) return [];

  // Sort by confidence (descending)
  const sortedBoxes = [...boxes].sort((a, b) => b.probability - a.probability);
  const selected: DetectionBox[] = [];
  const suppressed = new Set<number>();

  sortedBoxes.forEach((box, i) => {
    if (suppressed.has(i)) return;

    // Keep this box
    selected.push(box);

    // Check all remaining boxes for overlap
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
