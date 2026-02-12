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
 * ONNX Tensor output structure
 */
export type TensorOutput = {
  readonly dims: readonly number[];
  readonly data: Float32Array | Int32Array | Uint8Array;
};

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

/**
 * License plate database entry
 */
export type PlateInfo = {
  readonly plate: string;
  readonly owner: string;
  readonly vehicle: string;
  readonly color: string;
  readonly notes?: string;
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

// ============================================================
// UTILITY TYPES
// ============================================================

/**
 * Result type for operations that can fail
 */
export type Result<T, E = Error> =
  | { readonly success: true; readonly value: T }
  | { readonly success: false; readonly error: E };

/**
 * Async result type
 */
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

/**
 * Non-empty array type
 */
export type NonEmptyArray<T> = readonly [T, ...T[]];

/**
 * Branded type for type-safe primitive values
 */
type Brand<K, T> = K & { readonly __brand: T };

/**
 * Type-safe plate string
 */
export type PlateString = Brand<string, 'PlateString'>;

/**
 * Type-safe confidence value (0-100)
 */
export type Confidence = Brand<number, 'Confidence'>;

/**
 * Helper to create branded types
 */
export const createBrand = <T, B>(value: T): Brand<T, B> => value as Brand<T, B>;

/**
 * Helper to validate confidence is in range
 */
export const createConfidence = (value: number): Confidence | null => {
  if (value >= 0 && value <= 100) {
    return createBrand<number, 'Confidence'>(value);
  }
  return null;
};

/**
 * Helper to create plate string
 */
export const createPlateString = (value: string): PlateString => {
  return createBrand<string, 'PlateString'>(value.trim().toUpperCase());
};
