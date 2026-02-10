declare module "@techstark/opencv-js" {
  export interface Mat {
    rows: number;
    cols: number;
    data: Uint8Array;
    delete(): void;
    data32F: Float32Array;
  }

  export interface Size {
    width: number;
    height: number;
  }

  export interface Scalar {
    new (v0: number, v1: number, v2: number, v3?: number): Scalar;
  }

  export const CV_8UC3: number;
  export const COLOR_RGBA2BGR: number;
  export const BORDER_CONSTANT: number;

  export function imread(source: HTMLImageElement | HTMLCanvasElement | string): Mat;
  export function cvtColor(src: Mat, dst: Mat, code: number): void;
  export function resize(src: Mat, dst: Mat, dsize: Size): void;
  export function copyMakeBorder(
    src: Mat,
    dst: Mat,
    top: number,
    bottom: number,
    left: number,
    right: number,
    borderType: number
  ): void;
  export function blobFromImage(
    image: Mat,
    scalefactor?: number,
    size?: Size,
    mean?: Scalar,
    swapRB?: boolean,
    crop?: boolean
  ): Mat;

  export class Mat {
    constructor(rows?: number, cols?: number, type?: number);
    rows: number;
    cols: number;
    data: Uint8Array;
    data32F: Float32Array;
    delete(): void;
  }

  export class Size {
    constructor(width: number, height: number);
    width: number;
    height: number;
  }

  export class Scalar {
    constructor(v0: number, v1: number, v2: number, v3?: number);
  }

  export let onRuntimeInitialized: (() => void | Promise<void>) | undefined;
}
