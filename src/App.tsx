import React, { useState, useRef } from "react";
import cv from "@techstark/opencv-js";
import { Tensor, InferenceSession } from "onnxruntime-web";
import Loader from "./components/loader";
import { detectImageSimple } from "./utils/detectSimple";
import { download } from "./utils/download";
import "./style/App.css";

interface LoadingState {
  text: string;
  progress: number | null;
}

interface Session {
  net: InferenceSession;
}

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<LoadingState | null>({ text: "Loading OpenCV.js", progress: null });
  const [image, setImage] = useState<string | null>(null);
  const inputImage = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // configs
  const modelName = "license-plate.onnx";
  const modelInputShape = [1, 3, 640, 640];
  const iouThreshold = 0.3;
  const scoreThreshold = 0.25;

  // wait until opencv.js initialized
  (cv as any)["onRuntimeInitialized"] = async () => {
    const baseModelURL = `${process.env.PUBLIC_URL}/model`;

    // create session
    const arrBufNet = await download(
      `${baseModelURL}/${modelName}`, // url
      ["Loading License Plate Detection model", setLoading] // logger
    );
    const yolov8 = await InferenceSession.create(arrBufNet);

    // warmup main model
    setLoading({ text: "Warming up model...", progress: null });
    const tensor = new Tensor(
      "float32",
      new Float32Array(modelInputShape.reduce((a, b) => a * b)),
      modelInputShape
    );
    await yolov8.run({ images: tensor });

    setSession({ net: yolov8 });
    setLoading(null);
  };

  return (
    <div className="App">
      {loading && (
        <Loader>
          {loading.progress ? `${loading.text} - ${loading.progress}%` : loading.text}
        </Loader>
      )}
      <div className="header">
        <h1>License Plate Detection App</h1>
        <p>
          License plate detection application live on browser powered by{" "}
          <code>onnxruntime-web</code>
        </p>
        <p>
          Serving : <code className="code">{modelName}</code>
        </p>
      </div>

      <div className="content">
        <img
          ref={imageRef}
          src="#"
          alt=""
          style={{ display: image ? "block" : "none" }}
          onLoad={() => {
            if (!imageRef.current || !canvasRef.current || !session) return;
            
            // Set canvas size to match image
            canvasRef.current.width = imageRef.current.width;
            canvasRef.current.height = imageRef.current.height;
            
            detectImageSimple(
              imageRef.current,
              canvasRef.current,
              session,
              iouThreshold,
              scoreThreshold,
              modelInputShape
            );
          }}
        />
        <canvas
          id="canvas"
          ref={canvasRef}
        />
      </div>

      <input
        type="file"
        ref={inputImage}
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          // handle next image to detect
          if (image) {
            URL.revokeObjectURL(image);
            setImage(null);
          }

          const file = e.target.files?.[0];
          if (!file) return;

          const url = URL.createObjectURL(file); // create image url
          if (imageRef.current) {
            imageRef.current.src = url; // set image source
          }
          setImage(url);
        }}
      />
      <div className="btn-container">
        <button
          onClick={() => {
            inputImage.current?.click();
          }}
        >
          Open local image
        </button>
        {image && (
          /* show close btn when there is image */
          <button
            onClick={() => {
              if (inputImage.current) inputImage.current.value = "";
              if (imageRef.current) imageRef.current.src = "#";
              URL.revokeObjectURL(image);
              setImage(null);
            }}
          >
            Close image
          </button>
        )}
      </div>
    </div>
  );
};

export default App;
