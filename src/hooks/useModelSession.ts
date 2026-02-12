import { useState, useEffect } from 'react';
import { Tensor, InferenceSession } from 'onnxruntime-web';
import * as ort from 'onnxruntime-web';
import { download } from '../utils/download';
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
  setLoading: (state: LoadingState | null) => void
) => {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    if (!openCVReady) return;

    const initModel = async () => {
      const baseModelURL = `${import.meta.env.BASE_URL}model`;

      // Load License Plate Detection model
      const arrBufNet = await download(`${baseModelURL}/${MODEL_CONFIG.name}`, [
        'Loading License Plate Detection model',
        setLoading,
      ]);
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

export { MODEL_CONFIG };
