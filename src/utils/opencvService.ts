/**
 * Central OpenCV service to avoid (window as any).cv everywhere
 * Provides type-safe access to OpenCV.js functionality
 */

import { OpenCVType } from "../types/OpenCVType";

/**
 * Gets the global OpenCV instance
 * @throws Error if OpenCV is not loaded
 */
export const getOpenCV = (): OpenCVType => {
  const cv = (window as any).cv;
  if (!cv) {
    throw new Error('OpenCV is not loaded');
  }
  return cv as OpenCVType;
};

/**
 * Checks if OpenCV is loaded and available on window
 */
export const isOpenCVLoaded = (): boolean => {
  return typeof (window as any).cv !== 'undefined' && (window as any).cv !== null;
};