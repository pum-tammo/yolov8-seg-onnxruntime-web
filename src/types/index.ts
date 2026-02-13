import { InferenceSession } from 'onnxruntime-web';

// ============================================================
// CORE TYPES
// ============================================================

/**
 * ONNX Runtime session wrapper
 */
export type Session = {
  readonly net: InferenceSession;
};

/**
 * Loading state for async operations
 */
export type LoadingState = {
  readonly text: string;
  readonly progress: number | null;
};

// ============================================================
// DETECTION TYPES
// ============================================================

/**
 * Bounding box with detection metadata
 */
export type BoundingBox = readonly [x: number, y: number, width: number, height: number];

/**
 * Detected license plate box with OCR results
 */
export type DetectionBox = {
  readonly label: string;
  readonly probability: number;
  readonly color: string;
  readonly bounding: BoundingBox;
  readonly text?: string;
  readonly confidence?: number;
};

/**
 * Scanner configuration
 */
export type ScannerConfig = {
  readonly intervalMs: number;
  readonly iouThreshold: number;
  readonly scoreThreshold: number;
  readonly inputShape: readonly [batch: number, channels: number, width: number, height: number];
};

/**
 * Model configuration
 */
export type ModelConfig = {
  readonly name: string;
  readonly inputShape: readonly [batch: number, channels: number, width: number, height: number];
  readonly iouThreshold: number;
  readonly scoreThreshold: number;
};

// ============================================================
// RESULT TYPES
// ============================================================

/**
 * Scan result with detected plate
 */
export type ScanResult = {
  readonly plate: string;
  readonly confidence: number;
  readonly timestamp: number;
};

/**
 * OCR recognition result
 */
export type OCRResult = {
  readonly text: string;
  readonly confidence: number;
};

// ============================================================
// CAMERA TYPES
// ============================================================

/**
 * Camera state
 */
export type CameraState = {
  readonly isActive: boolean;
  readonly error: string | null;
  readonly stream: MediaStream | null;
};
