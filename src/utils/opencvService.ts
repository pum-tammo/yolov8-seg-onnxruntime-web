/**
 * Central OpenCV service to avoid (window as any).cv everywhere
 * Provides type-safe access to OpenCV.js functionality
 */

type OpenCVType = any; // OpenCV.js doesn't provide TypeScript types

/**
 * Gets the global OpenCV instance
 * @throws Error if OpenCV is not loaded
 */
export const getOpenCV = (): OpenCVType => {
  const cv = (window as any).cv;
  if (!cv) {
    throw new Error('OpenCV is not loaded');
  }
  return cv;
};

/**
 * Checks if OpenCV is ready
 */
export const isOpenCVReady = (): boolean => {
  return typeof (window as any).cv !== 'undefined';
};
