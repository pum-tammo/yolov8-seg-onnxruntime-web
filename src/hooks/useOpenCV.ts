import { useState, useEffect } from 'react';

const OPENCV_URL = 'https://docs.opencv.org/4.5.5/opencv.js';

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
      // Wait for OpenCV to initialize
      const checkOpenCV = () => {
        if ((window as any).cv) {
          setIsReady(true);
        } else {
          setTimeout(checkOpenCV, 100);
        }
      };
      checkOpenCV();
    };

    script.onerror = () => {
      console.error('Failed to load OpenCV.js from CDN');
    };

    document.head.appendChild(script);

    // Cleanup function
    return () => {
      // Note: We don't remove the script on unmount as other components might need it
    };
  }, []);

  return isReady;
};
