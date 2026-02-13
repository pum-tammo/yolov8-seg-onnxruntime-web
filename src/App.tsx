import React, { useState, useCallback, useEffect } from "react";
import Loader from "./components/loader";
import { useCamera } from "./hooks/useCamera";
import { useOpenCV } from "./hooks/useOpenCV";
import { useModelSession, MODEL_CONFIG } from "./hooks/useModelSession";
import { usePlateScanner } from "./hooks/usePlateScanner";
import type { LoadingState, ScanResult } from "./types";
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

  const [scanLog, setScanLog] = useState<ScanResult[]>([]);
  const [matchResult, setMatchResult] = useState<string | null>(null);

  const openCVReady = useOpenCV();
  const session = useModelSession(openCVReady, setLoading);

  const {
    videoRef,
    isActive: cameraActive,
    error: cameraError,
    startCamera,
    stopCamera,
  } = useCamera();

  const {
    canvasRef,
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
      setScanLog((prev) => [...prev, result]);
    },
  );

  useEffect(() => {
    if (scanLog.length >= 3) {
      const last3 = scanLog.slice(-3);
      const allHighConf = last3.every((r) => r.confidence >= 90);
      const allSamePlate = last3.every((r) => r.plate === last3[0].plate);
      if (allHighConf && allSamePlate) {
        setMatchResult(last3[0].plate);
        stopScanning();
        stopCamera();
      }
    }
  }, [scanLog]);

  const handleCameraStart = useCallback(async () => {
    resetScanner();
    setScanLog([]);
    setMatchResult(null);
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
    resetScanner();
    stopScanning();
    stopCamera();
  }, [resetScanner, stopScanning, stopCamera]);

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
        <div
          style={{ position: "relative", maxWidth: "640px", margin: "0 auto" }}
        >
          <video
            ref={videoRef}
            style={{
              display: cameraActive ? "block" : "none",
              width: "100%",
              borderRadius: "8px",
            }}
            playsInline
            muted
          />
          <canvas
            ref={canvasRef}
            style={{
              display: cameraActive ? "block" : "none",
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              borderRadius: "8px",
              pointerEvents: "none",
            }}
          />
        </div>
      </div>

      <div className="btn-container">
        {!cameraActive && (
          <button onClick={handleCameraStart}>Kamera starten</button>
        )}
        {cameraActive && (
          <button onClick={handleCameraStop}>Kamera stoppen</button>
        )}
      </div>

      {/* Match Result */}
      {matchResult && (
        <div
          style={{
            marginTop: 24,
            fontWeight: "bold",
            fontSize: 20,
            color: "green",
          }}
        >
          Erkanntes Kennzeichen: {matchResult}
        </div>
      )}

      {/* Scan Log */}
      {scanLog.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3>Scan Log</h3>
          <ul>
            {scanLog.map((entry, idx) => (
              <li key={idx}>
                {entry.plate} ({entry.confidence.toFixed(1)}%) –{" "}
                {new Date(entry.timestamp).toLocaleTimeString()}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default App;
