import type { BoundingBox } from '../../types';

/**
 * Creates a temporary canvas with specified dimensions
 */
export const createCanvas = (width: number, height: number): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

/**
 * Draws an image/video source to a canvas
 */
export const drawToCanvas = (
  source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  canvas: HTMLCanvasElement
): CanvasRenderingContext2D | null => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return ctx;
};

/**
 * Converts a video element to a canvas for processing
 * Useful because OpenCV cannot directly read from video elements
 */
export const videoToCanvas = (video: HTMLVideoElement): HTMLCanvasElement => {
  const canvas = createCanvas(video.videoWidth, video.videoHeight);
  drawToCanvas(video, canvas);
  return canvas;
};

/**
 * Crops a region from a canvas based on bounding box coordinates
 */
export const cropCanvas = (
  source: HTMLCanvasElement,
  bounding: BoundingBox
): HTMLCanvasElement => {
  const [x, y, width, height] = bounding;
  const cropCanvas = createCanvas(width, height);
  
  const ctx = cropCanvas.getContext('2d');
  if (!ctx) return cropCanvas;
  
  ctx.drawImage(source, x, y, width, height, 0, 0, width, height);
  return cropCanvas;
};

/**
 * Clears a canvas completely
 */
export const clearCanvas = (canvas: HTMLCanvasElement): void => {
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
};
