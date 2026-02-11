import React, { useState, useRef, useCallback, useEffect } from "react";
import { Tensor, InferenceSession } from "onnxruntime-web";
import Loader from "./components/loader";
import { PlateInfoCard } from "./components/PlateInfoCard";
import { detectImageSimple } from "./utils/detectSimple";
import { download } from "./utils/download";
import { globalOCREngine } from "./utils/ocr/ocrEngine";
import { useCamera } from "./hooks/useCamera";
import { usePlateScanner, ScanResult } from "./hooks/usePlateScanner";
import { plateDatabase, PlateInfo } from "./utils/plateDatabase";
import "./style/App.css";

// Configure ONNX Runtime WebAssembly paths
import * as ort from "onnxruntime-web";
ort.env.wasm.wasmPaths = `${import.meta.env.BASE_URL}`;
ort.env.wasm.numThreads = 1;

// Configure execution providers: WebGL (fast) with WASM fallback (compatible)
const executionProviders: ort.InferenceSession.ExecutionProviderConfig[] = [
  "webgl",
  "wasm",
];

// Types
interface LoadingState {
  text: string;
  progress: number | null;
}

interface Session {
  net: InferenceSession;
}

// Constants
const MODEL_CONFIG = {
  name: "license-plate.onnx",
  inputShape: [1, 3, 640, 640],
  iouThreshold: 0.3,
  scoreThreshold: 0.25,
};

// Custom Hooks
const useOpenCV = () => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const checkOpenCV = () => {
      const w = window as any;
      if (typeof w.cv === "undefined") {
        setTimeout(checkOpenCV, 100);
      } else {
        setIsReady(true);
      }
    };
    checkOpenCV();
  }, []);

  return isReady;
};

const useModelSession = (
  openCVReady: boolean,
  setLoading: (state: LoadingState | null) => void,
) => {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    if (!openCVReady) return;

    const initModel = async () => {
      const baseModelURL = `${import.meta.env.BASE_URL}model`;

      // Load License Plate Detection model
      const arrBufNet = await download(`${baseModelURL}/${MODEL_CONFIG.name}`, [
        "Loading License Plate Detection model",
        setLoading,
      ]);
      const yolov8 = await InferenceSession.create(arrBufNet, {
        executionProviders,
      });

      setLoading({ text: "Warming up detection model...", progress: null });
      const tensor = new Tensor(
        "float32",
        new Float32Array(MODEL_CONFIG.inputShape.reduce((a, b) => a * b)),
        MODEL_CONFIG.inputShape,
      );
      await yolov8.run({ images: tensor });

      // Load OCR model
      setLoading({ text: "Loading OCR model...", progress: null });
      await globalOCREngine.initialize(`${baseModelURL}/plate-ocr.onnx`);

      setSession({ net: yolov8 });
      setLoading(null);
    };

    initModel();
  }, [openCVReady, setLoading]);

  return session;
};

const useImageUpload = () => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const openFilePicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const setImage = useCallback((url: string | null) => {
    setImageUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
  }, []);

  const clearImage = useCallback(() => {
    if (inputRef.current) inputRef.current.value = "";
    setImageUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  return { imageUrl, inputRef, openFilePicker, setImage, clearImage };
};

// Components
const Header: React.FC = () => (
  <div className="header">
    <h1>License Plate Recognition</h1>
    <p>
      Automatic License Plate Recognition (ALPR) powered by{" "}
      <code>onnxruntime-web</code>
    </p>
    <p>YOLOv8 Detection + MobileViT OCR</p>
  </div>
);

const App: React.FC = () => {
  const [loading, setLoading] = useState<LoadingState | null>({
    text: "Loading OpenCV.js",
    progress: null,
  });
  const [mode, setMode] = useState<'camera' | 'image'>('camera');
  const [foundPlate, setFoundPlate] = useState<PlateInfo | null>(null);
  const [scanConfidence, setScanConfidence] = useState<number | undefined>(undefined);

  const openCVReady = useOpenCV();
  const session = useModelSession(openCVReady, setLoading);
  const { imageUrl, inputRef, openFilePicker, setImage, clearImage } = useImageUpload();

  // Camera mode
  const { videoRef, isActive: cameraActive, error: cameraError, startCamera, stopCamera } = useCamera();
  
  // Scanner with 500ms interval
  const { isScanning, canvasRef: scanCanvasRef, startScanning, stopScanning } = usePlateScanner(
    session,
    {
      intervalMs: 500,
      iouThreshold: MODEL_CONFIG.iouThreshold,
      scoreThreshold: MODEL_CONFIG.scoreThreshold,
      inputShape: MODEL_CONFIG.inputShape,
    },
    (result: ScanResult) => {
      // Check if plate exists in database
      const plateInfo = plateDatabase.findPlate(result.plate);
      if (plateInfo) {
        setFoundPlate(plateInfo);
        setScanConfidence(result.confidence);
        // Stop camera to save battery
        stopScanning();
        stopCamera();
      }
    }
  );

  // Image mode refs
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleCameraStart = useCallback(async () => {
    setMode('camera');
    setFoundPlate(null);
    await startCamera();
    if (videoRef.current && session) {
      setTimeout(() => {
        if (videoRef.current) {
          startScanning(videoRef.current);
        }
      }, 500);
    }
  }, [startCamera, startScanning, session, videoRef]);

  const handleCameraStop = useCallback(() => {
    stopScanning();
    stopCamera();
    setFoundPlate(null);
  }, [stopScanning, stopCamera]);

  const handleImageMode = useCallback(() => {
    setMode('image');
    stopScanning();
    stopCamera();
    setFoundPlate(null);
  }, [stopScanning, stopCamera]);

  const handleImageLoad = useCallback(() => {
    if (!imageRef.current || !canvasRef.current || !session) return;

    canvasRef.current.width = imageRef.current.width;
    canvasRef.current.height = imageRef.current.height;

    detectImageSimple(
      imageRef.current,
      canvasRef.current,
      session,
      MODEL_CONFIG.iouThreshold,
      MODEL_CONFIG.scoreThreshold,
      MODEL_CONFIG.inputShape,
    );
  }, [session]);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const url = URL.createObjectURL(file);
      if (imageRef.current) {
        imageRef.current.src = url;
      }
      setImage(url);
    },
    [setImage],
  );

  return (
    <div className="App">
      {loading && (
        <Loader>
          {loading.progress
            ? `${loading.text} - ${loading.progress}%`
            : loading.text}
        </Loader>
      )}

      <Header />

      <div className="mode-toggle">
        <button
          className={mode === 'camera' ? 'active' : ''}
          onClick={handleCameraStart}
          disabled={!session}
        >
          📷 Kamera
        </button>
        <button
          className={mode === 'image' ? 'active' : ''}
          onClick={handleImageMode}
          disabled={!session}
        >
          🖼️ Bild
        </button>
      </div>

      {cameraError && (
        <div className="error-message">
          Kamera-Fehler: {cameraError}
        </div>
      )}

      <div className="content">
        {mode === 'camera' ? (
          <>
            <video
              ref={videoRef}
              style={{
                display: cameraActive ? 'block' : 'none',
                width: '100%',
                maxWidth: '640px',
                borderRadius: '8px',
              }}
              playsInline
              muted
            />
            <canvas
              ref={scanCanvasRef}
              style={{
                display: isScanning ? 'block' : 'none',
                width: '100%',
                maxWidth: '640px',
                borderRadius: '8px',
              }}
            />
          </>
        ) : (
          <>
            <img
              ref={imageRef}
              src={imageUrl || "#"}
              alt=""
              style={{ display: imageUrl ? "block" : "none" }}
              onLoad={handleImageLoad}
            />
            <canvas id="canvas" ref={canvasRef} />
          </>
        )}
      </div>

      {mode === 'camera' && foundPlate && (
        <PlateInfoCard plateInfo={foundPlate} confidence={scanConfidence} />
      )}

      <input
        type="file"
        ref={inputRef}
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFileInput}
      />

      <div className="btn-container">
        {mode === 'image' ? (
          <>
            <button onClick={openFilePicker}>Open local image</button>
            {imageUrl && <button onClick={clearImage}>Close image</button>}
          </>
        ) : (
          <>
            {!cameraActive && !foundPlate && (
              <button onClick={handleCameraStart}>Kamera starten</button>
            )}
            {cameraActive && (
              <button onClick={handleCameraStop}>Kamera stoppen</button>
            )}
            {foundPlate && (
              <button onClick={handleCameraStart}>Neu scannen</button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default App;
