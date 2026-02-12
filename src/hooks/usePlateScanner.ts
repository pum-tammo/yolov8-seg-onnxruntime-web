import { useState, useCallback, useRef, useEffect } from 'react';
import { detectImageSimple } from '../utils/detectSimple';
import { renderBoxes } from '../utils/renderBox';
import type { Session, ScannerConfig, ScanResult, DetectionBox } from '../types';

export const usePlateScanner = (
  session: Session | null,
  config: ScannerConfig,
  onPlateDetected?: (result: ScanResult) => void
) => {
  const [isScanning, setIsScanning] = useState(false);
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Update canvas overlay with detection boxes
  const updateCanvasOverlay = useCallback((boxes: readonly DetectionBox[], videoWidth: number, videoHeight: number) => {
    if (!canvasRef.current) return;
    
    canvasRef.current.width = videoWidth;
    canvasRef.current.height = videoHeight;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, videoWidth, videoHeight);
    if (boxes?.length > 0) {
      renderBoxes(ctx, boxes);
    }
  }, []);

  // Process detected boxes and trigger callback
  const processDetection = useCallback((boxes: readonly DetectionBox[]) => {
    const detectedBox = boxes.find((box) => box.text && box.text.length > 0);
    if (detectedBox?.text) {
      const result: ScanResult = {
        plate: detectedBox.text,
        confidence: detectedBox.confidence || 0,
        timestamp: Date.now(),
      };
      setLastResult(result);
      onPlateDetected?.(result);
    }
  }, [onPlateDetected]);

  const captureFrame = useCallback(
    async (videoElement: HTMLVideoElement) => {
      if (!session || !videoElement.videoWidth) return;

      // Create temporary canvas for detection
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = videoElement.videoWidth;
      tempCanvas.height = videoElement.videoHeight;
      const ctx = tempCanvas.getContext('2d');
      if (!ctx) return;

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

      // Update overlay and process results
      updateCanvasOverlay(boxes, videoElement.videoWidth, videoElement.videoHeight);
      if (boxes?.length > 0) {
        processDetection(boxes);
      }
    },
    [session, config, updateCanvasOverlay, processDetection]
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
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
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
