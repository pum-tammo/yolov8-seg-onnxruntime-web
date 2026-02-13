/**
 * Typdefinition für die OpenCV.js Instanz
 */
export type OpenCVType = {
  imread: (element: HTMLImageElement | HTMLCanvasElement) => { rows: any, cols: any, delete: () => void };
  Mat: new (...args: any[]) => any;
  CV_8UC3: number;
  COLOR_RGBA2BGR: number;
  BORDER_CONSTANT: number;
  cvtColor: (src: any, dst: any, code: number) => void;
  resize: (src: any, dst: any, size: any) => void;
  Size: new (width: number, height: number) => any;
  copyMakeBorder: (...args: any[]) => void;
  blobFromImage: (...args: any[]) => any;
  Scalar: new (...args: number[]) => any;
};