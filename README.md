# ALPR Browser

![react](https://img.shields.io/badge/React-blue?logo=react)
![onnxruntime-web](https://img.shields.io/badge/onnxruntime--web-white?logo=onnx&logoColor=black)
![opencv.js](https://img.shields.io/badge/opencv.js-green?logo=opencv)

**Automatic License Plate Recognition (ALPR)** application running entirely in your browser.
Combines YOLOv11 detection with fast-plate-ocr for real-time license plate recognition using onnxruntime-web with WebAssembly backend.

## Features

- 📸 **Real-time Camera Detection** - Live camera feed with transparent detection overlay
- 🚗 **License Plate Detection** - YOLOv11n model detects plates in video stream
- 🔤 **Text Recognition** - OCR model reads plate numbers (65+ countries)
- 💾 **Plate Database** - Match detected plates against local database
- ⚡ **Browser-based** - Runs entirely client-side with WebAssembly
- 🔒 **Privacy First** - No data sent to servers, all processing local
- 📱 **Mobile Ready** - Responsive design works on desktop and mobile

## 🤖 About the Models

### YOLOv11 License Plate Detection
The detection model is YOLOv11n (nano variant) from [morsetechlab/yolov11-license-plate-detection](https://huggingface.co/morsetechlab/yolov11-license-plate-detection). It's optimized for:
- Fast inference on edge devices
- Accurate license plate localization
- Multiple plate detection in single frame
- Converted to ONNX format for browser compatibility

### Fast Plate OCR
The OCR model uses MobileViT-v2 architecture trained on global license plates. Supports 65+ countries with high accuracy on alphanumeric characters.

## Tech Stack

- **React + TypeScript** - Modern UI framework with type safety
- **Vite** - Fast build tool and dev server
- **ONNX Runtime Web** - ML inference in browser
- **OpenCV.js** - Image preprocessing (self-hosted, ~8.6 MB)
- **YOLOv11n** - License plate detection model (~6 MB)
- **MobileViT-v2** - OCR model from fast-plate-ocr (~660 KB)

## Setup

```bash
npm install
npm start  # Start dev server at http://localhost:5173
```

## Models

### Detection Model

YOLOv11n fine-tuned for license plate detection from [morsetechlab/yolov11-license-plate-detection](https://huggingface.co/morsetechlab/yolov11-license-plate-detection)

- Model: `public/model/license-plate.onnx`
- Size: ~6 MB
- Architecture: YOLOv11n (nano)
- Input: 640x640 RGB
- Detection interval: 500ms (2x/second)

### OCR Model

Global license plate OCR from [fast-plate-ocr](https://github.com/ankandrew/fast-plate-ocr)

- Model: `public/model/plate-ocr.onnx` (MobileViT-v2)
- Config: `public/model/plate-ocr-config.yaml`
- Size: ~660 KB
- Supports: 65+ countries
- Alphabet: 0-9, A-Z

### OpenCV.js

Self-hosted for preprocessing (resize, color conversion, padding) from [OpenCV Documentation](https://docs.opencv.org/)

- File: `public/opencv.js`
- Version: 4.5.5
- Size: ~8.6 MB
- See `public/README.md` for update instructions

## Architecture

### Key Components

- **App.tsx** - Main application, orchestrates camera and scanning
- **useCamera.ts** - Camera access and video stream management
- **usePlateScanner.ts** - Scanning loop (333ms intervals), canvas rendering
- **useModelSession.ts** - ONNX model loading and session management
- **useOpenCV.ts** - Dynamic OpenCV.js loading
- **detectSimple.ts** - YOLO detection pipeline + sequential OCR
- **ocrEngine.ts** - OCR preprocessing and inference
- **plateDatabase.ts** - Local plate lookup

### Scanning Pipeline

1. Camera captures video frame (native 60fps browser rendering)
2. Every 500ms: Frame → YOLOv11 detection
3. Detected boxes → Crop → OCR (sequential to avoid session conflicts)
4. OCR results → Match against database
5. Draw bounding boxes as transparent overlay on video

### Performance Optimizations

- **Transparent Canvas Overlay** - Native video rendering + detection overlay
- **Sequential OCR** - Prevents "Session already started" errors
- **500ms interval** - Optimal balance for 5+ year old devices (2 detections/second)
- **Self-hosted OpenCV.js** - No CDN dependency, works offline
- **WebAssembly** - Near-native performance in browser

## Configuration

Edit detection parameters in [src/App.tsx](src/App.tsx):

```typescript
const MODEL_CONFIG = {
  intervalMs: 500, // Detection interval (ms)
  iouThreshold: 0.4, // NMS IoU threshold
  scoreThreshold: 0.25, // Min confidence score
  inputShape: [1, 3, 640, 640],
};
```

## License Plate Database

Edit [src/data/licensePlates.json](src/data/licensePlates.json) to add plates:

```json
[
  {
    "plate": "ABC123",
    "owner": "John Doe",
    "vehicle": "Tesla Model 3",
    "color": "White",
    "notes": "Authorized visitor"
  }
]
```

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 89+
- Safari 15.4+
- Requires camera permissions
- COOP/COEP headers for SharedArrayBuffer (already configured in vite.config.ts)

## Credits

Based on [yolov8-seg-onnxruntime-web](https://github.com/Hyuto/yolov8-seg-onnxruntime-web) by Hyuto.  
YOLOv11 detection model from [morsetechlab/yolov11-license-plate-detection](https://huggingface.co/morsetechlab/yolov11-license-plate-detection).  
OCR model from [fast-plate-ocr](https://github.com/ankandrew/fast-plate-ocr) by ankandrew.
