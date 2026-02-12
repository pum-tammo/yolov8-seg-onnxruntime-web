import { useState, useEffect } from 'react';

// Use Vite's base URL to construct the correct path
const OPENCV_URL = `${import.meta.env.BASE_URL}opencv.js`;

export const useOpenCV = () => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Check if OpenCV is already loaded
    if ((window as any).cv) {
      setIsReady(true);
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector(`script[src="${OPENCV_URL}"]`);
    if (existingScript) {
      // Script exists, wait for it to load
      const checkOpenCV = () => {
        if ((window as any).cv) {
          setIsReady(true);
        } else {
          setTimeout(checkOpenCV, 100);
        }
      };
      checkOpenCV();
      return;
    }

    // Create and load script dynamically
    const script = document.createElement('script');
    script.src = OPENCV_URL;
    script.async = true;
    script.type = 'text/javascript';

    script.onload = () => {
      // Wait for OpenCV to initialize (it self-executes and sets window.cv)
      const checkOpenCV = () => {
        const cv = (window as any).cv;
        if (cv && typeof cv.imread === 'function') {
          setIsReady(true);
        } else {
          setTimeout(checkOpenCV, 100);
        }
      };
      checkOpenCV();
    };

    script.onerror = () => {
      console.error('Failed to load OpenCV.js. Make sure the file exists in public/.');
    };

    document.head.appendChild(script);
  }, []);

  return isReady;
};
