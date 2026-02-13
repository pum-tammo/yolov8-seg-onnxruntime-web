import { useState, useEffect, Dispatch, SetStateAction } from 'react';
import { Tensor, InferenceSession } from 'onnxruntime-web';
import * as ort from 'onnxruntime-web';
import { globalOCREngine } from '../utils/ocr/ocrEngine';
import type { Session, LoadingState, ModelConfig } from '../types';

// Configure ONNX Runtime WebAssembly paths
ort.env.wasm.wasmPaths = `${import.meta.env.BASE_URL}`;
ort.env.wasm.numThreads = 1;

const MODEL_CONFIG: ModelConfig = {
  name: 'license-plate.onnx',
  inputShape: [1, 3, 640, 640] as const,
  iouThreshold: 0.3,
  scoreThreshold: 0.25,
};

const executionProviders: InferenceSession.ExecutionProviderConfig[] = [
  'webgl',
  'wasm',
];

export const useModelSession = (
  openCVReady: boolean,
  setLoading: Dispatch<SetStateAction<LoadingState | null>>
) => {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    if (!openCVReady) return;

    const initModel = async () => {
      const baseModelURL = `${import.meta.env.BASE_URL}model`;

      // Load License Plate Detection model
      const arrBufNet = await download(`${baseModelURL}/${MODEL_CONFIG.name}`,
        'Loading License Plate Detection model',
        setLoading
      );
      const yolov8 = await InferenceSession.create(arrBufNet, {
        executionProviders,
      });

      setLoading({ text: 'Warming up detection model...', progress: null });
      const tensor = new Tensor(
        'float32',
        new Float32Array(MODEL_CONFIG.inputShape.reduce((a, b) => a * b)),
        MODEL_CONFIG.inputShape
      );
      await yolov8.run({ images: tensor });

      // Load OCR model
      setLoading({ text: 'Loading OCR model...', progress: null });
      await globalOCREngine.initialize(`${baseModelURL}/plate-ocr.onnx`);

      setSession({ net: yolov8 });
      setLoading(null);
    };

    initModel();
  }, [openCVReady, setLoading]);

  return session;
};

const download = (url: string, loadingText: string, logger:  Dispatch<SetStateAction<LoadingState | null>> | null = null): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("GET", url, true);
    request.responseType = "arraybuffer";
    if (logger) {
      request.onprogress = (e) => {
        const progress = (e.loaded / e.total) * 100;
        logger(() => ({text: loadingText, progress: parseFloat(progress.toFixed(2))}));
      };
    }
    request.onload = function () {
      if (this.status >= 200 && this.status < 300) {
        resolve(request.response);
      } else {
        reject({
          status: this.status,
          statusText: request.statusText,
        });
      }
    };
    request.onerror = function () {
      reject({
        status: this.status,
        statusText: request.statusText,
      });
    };
    request.send();
  });
};

export { MODEL_CONFIG };
