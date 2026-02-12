import { useState, useCallback, useRef, useEffect } from 'react';
import { InferenceSession } from 'onnxruntime-web';
import { detectImageSimple } from '../utils/detectSimple';
import { renderBoxes } from '../utils/renderBox';

interface ScannerConfig {
  intervalMs: number;
  iouThreshold: number;
  scoreThreshold: number;
  inputShape: number[];
}

interface Session {
  net: InferenceSession;
}

export interface ScanResult {
  plate: string;
  confidence: number;
  timestamp: number;
}

export const usePlateScanner = (
  session: Session | null,
  config: ScannerConfig,
  onPlateDetected?: (result: ScanResult) => void
) => {
  const [isScanning, setIsScanning] = useState(false);
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const captureFrame = useCallback(
    async (videoElement: HTMLVideoElement) => {
      if (!session || !videoElement.videoWidth) return;

      const now = new Date();
      console.log('📸 Frame captured at', now.toLocaleTimeString() + '.' + now.getMilliseconds().toString().padStart(3, '0'));

      // Create temporary canvas for detection
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = videoElement.videoWidth;
      tempCanvas.height = videoElement.videoHeight;

      const ctx = tempCanvas.getContext('2d');
      if (!ctx) return;

      // Draw current video frame
      ctx.drawImage(videoElement, 0, 0);

      // Run detection + OCR
      const boxes = await detectImageSimple(
        videoElement,
        tempCanvas,
        session,
        config.iouThreshold,
        config.scoreThreshold,
        config.inputShape
      );

      // Update overlay canvas with boxes only (transparent background)
      if (canvasRef.current && videoElement.videoWidth > 0) {
        canvasRef.current.width = videoElement.videoWidth;
        canvasRef.current.height = videoElement.videoHeight;
        const displayCtx = canvasRef.current.getContext('2d');
        if (displayCtx) {
          // Clear canvas (transparent)
          displayCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          
          // Draw boxes only (no video frame)
          if (boxes && boxes.length > 0) {
            renderBoxes(displayCtx, boxes);
          }
        }
      }

      // Extract first detected plate with text
      if (boxes && boxes.length > 0) {
        const detectedBox = boxes.find((box) => box.text && box.text.length > 0);
        if (detectedBox && detectedBox.text) {
          const result: ScanResult = {
            plate: detectedBox.text,
            confidence: detectedBox.confidence || 0,
            timestamp: Date.now(),
          };
          
          setLastResult(result);
          onPlateDetected?.(result);
        }
      }
    },
    [session, config, onPlateDetected]
  );

  const startScanning = useCallback(
    (videoElement: HTMLVideoElement) => {
      if (isScanning || !session) return;

      setIsScanning(true);
      intervalRef.current = setInterval(() => {
        captureFrame(videoElement);
      }, config.intervalMs);
    },
    [isScanning, session, config.intervalMs, captureFrame]
  );

  const stopScanning = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsScanning(false);
  }, []);

  const reset = useCallback(() => {
    // Clear canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
    // Reset last result
    setLastResult(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    isScanning,
    lastResult,
    canvasRef,
    startScanning,
    stopScanning,
    reset,
  };
};
