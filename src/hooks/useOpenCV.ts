import { useState, useEffect } from 'react';

export const useOpenCV = () => {
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
