/**
 * Configuration for License Plate OCR Model
 */
export interface PlateOCRConfig {
  maxPlateSlots: number;
  alphabet: string;
  padChar: string;
  imgHeight: number;
  imgWidth: number;
}

/**
 * Global License Plate OCR Configuration
 * Supports 65+ countries worldwide
 */
export const GLOBAL_PLATE_OCR_CONFIG: PlateOCRConfig = {
  maxPlateSlots: 9,
  alphabet: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_',
  padChar: '_',
  imgHeight: 70,
  imgWidth: 140,
};
