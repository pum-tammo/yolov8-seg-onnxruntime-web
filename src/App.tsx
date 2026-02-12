import React, { useState, useCallback } from "react";
import Loader from "./components/loader";
import { PlateInfoCard } from "./components/PlateInfoCard";
import { useCamera } from "./hooks/useCamera";
import { useOpenCV } from "./hooks/useOpenCV";
import {
  useModelSession,
  MODEL_CONFIG,
  LoadingState,
} from "./hooks/useModelSession";
import { usePlateScanner, ScanResult } from "./hooks/usePlateScanner";
import { plateDatabase, PlateInfo } from "./utils/plateDatabase";
import "./style/App.css";

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
  const [foundPlate, setFoundPlate] = useState<PlateInfo | null>(null);
  const [scanConfidence, setScanConfidence] = useState<number | undefined>(
    undefined,
  );

  const openCVReady = useOpenCV();
  const session = useModelSession(openCVReady, setLoading);

  // Camera
  const {
    videoRef,
    isActive: cameraActive,
    error: cameraError,
    startCamera,
    stopCamera,
  } = useCamera();

  // Scanner with 500ms interval
  const {
    isScanning,
    canvasRef: scanCanvasRef,
    startScanning,
    stopScanning,
    reset: resetScanner,
  } = usePlateScanner(
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
    },
  );

  const handleCameraStart = useCallback(async () => {
    setFoundPlate(null);
    setScanConfidence(undefined);
    resetScanner();
    await startCamera();
    if (videoRef.current && session) {
      setTimeout(() => {
        if (videoRef.current) {
          startScanning(videoRef.current);
        }
      }, 500);
    }
  }, [startCamera, startScanning, session, videoRef, resetScanner]);

  const handleCameraStop = useCallback(() => {
    stopScanning();
    stopCamera();
    resetScanner();
    setFoundPlate(null);
  }, [stopScanning, stopCamera, resetScanner]);

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

      {cameraError && (
        <div className="error-message">Kamera-Fehler: {cameraError}</div>
      )}

      <div className="content">
        <video
          ref={videoRef}
          style={{
            display: cameraActive ? "block" : "none",
            width: "100%",
            maxWidth: "640px",
            borderRadius: "8px",
          }}
          playsInline
          muted
        />
        <canvas
          ref={scanCanvasRef}
          style={{
            display: isScanning ? "block" : "none",
            width: "100%",
            maxWidth: "640px",
            borderRadius: "8px",
          }}
        />
      </div>

      {foundPlate && (
        <PlateInfoCard plateInfo={foundPlate} confidence={scanConfidence} />
      )}

      <div className="btn-container">
        {!cameraActive && !foundPlate && (
          <button onClick={handleCameraStart}>Kamera starten</button>
        )}
        {cameraActive && (
          <button onClick={handleCameraStop}>Kamera stoppen</button>
        )}
        {foundPlate && <button onClick={handleCameraStart}>Neu scannen</button>}
      </div>
    </div>
  );
};

export default App;
