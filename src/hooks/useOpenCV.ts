
import { useState, useEffect } from 'react';
import { isOpenCVLoaded } from '../utils/opencvService';

const OPENCV_URL = `${import.meta.env.BASE_URL}opencv.js`;

export const useOpenCV = () => {
  const [isReady, setIsReady] = useState(false);

  // Hilfsfunktion für Polling
  const checkOpenCVReady = () => {
    if (isOpenCVLoaded()) {
      setIsReady(true);
    } else {
      setTimeout(checkOpenCVReady, 100);
    }
  };

  useEffect(() => {
    if (isOpenCVLoaded()) {
      setIsReady(true);
      return;
    }

    const existingScript = document.querySelector(`script[src="${OPENCV_URL}"]`);
    if (existingScript) {
      checkOpenCVReady();
      return;
    }

    const script = document.createElement('script');
    script.src = OPENCV_URL;
    script.async = true;
    script.type = 'text/javascript';

    script.onload = () => {
      checkOpenCVReady();
    };

    script.onerror = () => {
      console.error('Failed to load OpenCV.js. Make sure the file exists in public/.');
    };

    document.head.appendChild(script);
  }, []);

  return isReady;
};
