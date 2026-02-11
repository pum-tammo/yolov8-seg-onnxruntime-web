import { useState, useRef, useCallback, useEffect } from 'react';

interface CameraState {
  isActive: boolean;
  error: string | null;
  stream: MediaStream | null;
}

export const useCamera = () => {
  const [state, setState] = useState<CameraState>({
    isActive: false,
    error: null,
    stream: null,
  });
  const videoRef = useRef<HTMLVideoElement>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Rear camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      setState({
        isActive: true,
        error: null,
        stream,
      });
    } catch (error) {
      setState({
        isActive: false,
        error: error instanceof Error ? error.message : 'Camera access denied',
        stream: null,
      });
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (state.stream) {
      state.stream.getTracks().forEach((track) => track.stop());
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setState({
      isActive: false,
      error: null,
      stream: null,
    });
  }, [state.stream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (state.stream) {
        state.stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [state.stream]);

  return {
    videoRef,
    isActive: state.isActive,
    error: state.error,
    startCamera,
    stopCamera,
  };
};
