import React, { useState, useRef, useCallback, useEffect } from "react";
import { Tensor, InferenceSession } from "onnxruntime-web";
import Loader from "./components/loader";
import { detectImageSimple } from "./utils/detectSimple";
import { download } from "./utils/download";
import "./style/App.css";

// Configure ONNX Runtime WebAssembly paths
import * as ort from "onnxruntime-web";
ort.env.wasm.wasmPaths = `${import.meta.env.BASE_URL}`;
ort.env.wasm.numThreads = 1;

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
      if (typeof w.cv === 'undefined') {
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
  setLoading: (state: LoadingState | null) => void
) => {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    if (!openCVReady) return;

    const initModel = async () => {
      const baseModelURL = `${import.meta.env.BASE_URL}model`;

      const arrBufNet = await download(
        `${baseModelURL}/${MODEL_CONFIG.name}`,
        ["Loading License Plate Detection model", setLoading]
      );
      const yolov8 = await InferenceSession.create(arrBufNet);

      setLoading({ text: "Warming up model...", progress: null });
      const tensor = new Tensor(
        "float32",
        new Float32Array(MODEL_CONFIG.inputShape.reduce((a, b) => a * b)),
        MODEL_CONFIG.inputShape
      );
      await yolov8.run({ images: tensor });

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
    <h1>License Plate Detection App</h1>
    <p>
      License plate detection application live on browser powered by{" "}
      <code>onnxruntime-web</code>
    </p>
    <p>
      Serving : <code className="code">{MODEL_CONFIG.name}</code>
    </p>
  </div>
);

const App: React.FC = () => {
  const [loading, setLoading] = useState<LoadingState | null>({
    text: "Loading OpenCV.js",
    progress: null,
  });

  const openCVReady = useOpenCV();
  const session = useModelSession(openCVReady, setLoading);
  const { imageUrl, inputRef, openFilePicker, setImage, clearImage } = useImageUpload();

  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
      MODEL_CONFIG.inputShape
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
    [setImage]
  );

  return (
    <div className="App">
      {loading && (
        <Loader>
          {loading.progress ? `${loading.text} - ${loading.progress}%` : loading.text}
        </Loader>
      )}
      
      <Header />

      <div className="content">
        <img
          ref={imageRef}
          src={imageUrl || "#"}
          alt=""
          style={{ display: imageUrl ? "block" : "none" }}
          onLoad={handleImageLoad}
        />
        <canvas id="canvas" ref={canvasRef} />
      </div>

      <input
        type="file"
        ref={inputRef}
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFileInput}
      />

      <div className="btn-container">
        <button onClick={openFilePicker}>Open local image</button>
        {imageUrl && <button onClick={clearImage}>Close image</button>}
      </div>
    </div>
  );
};

export default App;
