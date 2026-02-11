# License Plate Recognition with onnxruntime-web

<p align="center">
  <img src="./sample.png" />
</p>

![love](https://img.shields.io/badge/Made%20with-🖤-white)
![react](https://img.shields.io/badge/React-blue?logo=react)
![onnxruntime-web](https://img.shields.io/badge/onnxruntime--web-white?logo=onnx&logoColor=black)
![opencv.js](https://img.shields.io/badge/opencv.js-green?logo=opencv)

---

**Automatic License Plate Recognition (ALPR)** application running entirely in your browser.
Combines YOLOv8 detection with fast-plate-ocr for end-to-end license plate recognition using onnxruntime-web with `wasm` backend.

## Features

- 🚗 **License Plate Detection** - YOLOv8 model detects plates in images
- 🔤 **Text Recognition** - ONNX OCR model reads plate numbers
- 🌍 **Global Support** - Recognizes plates from 65+ countries
- ⚡ **Fast** - Runs entirely in browser with WebAssembly
- 🎯 **Real-time** - Instant results with visual feedback

## Setup

```bash
git clone https://github.com/Hyuto/yolov8-seg-onnxruntime-web.git
cd yolov8-seg-onnxruntime-web
npm install # Install dependencies
```

## Scripts

```bash
npm start # Start dev server
npm build # Build for production
```

## Models

**Detection Model**

YOLOv8n model fine-tuned for license plate detection.

```
model : license-plate.onnx
size  : ~6 MB
```

**OCR Model**

Global license plate OCR model from [fast-plate-ocr](https://github.com/ankandrew/fast-plate-ocr).

```
model    : plate-ocr.onnx (MobileViT-v2)
size     : ~660 KB
supports : 65+ countries
alphabet : 0-9, A-Z
```

ONNX model to produce mask for every object detected [CUSTOM].

[![mask-yolov8-seg.onnx](https://img.shields.io/badge/mask--yolov8--seg.onnx-black?logo=onnx)](https://netron.app/?url=https://raw.githubusercontent.com/Hyuto/yolov8-seg-onnxruntime-web/master/public/model/mask-yolov8-seg.onnx)

## Use another model

> :warning: **Size Overload** : used YOLOv8 segmentation model in this repo is the smallest with size of 14 MB, so other models is definitely bigger than this which can cause memory problems on browser.

Use another YOLOv8 model.

1. Export YOLOv8 model to onnx format. Read more on the [official documentation](https://docs.ultralytics.com/tasks/segmentation/#export)

   ```python
   from ultralytics import YOLO

   # Load a model
   model = YOLO("yolov8*-seg.pt")  # load an official yolov8* model

   # Export the model
   model.export(format="onnx")
   ```

2. Copy `yolov8*.onnx` to `./public/model`
3. Update `modelName` in `App.jsx` to new model name
   ```jsx
   ...
   // configs
   const modelName = "yolov8*-seg.onnx";
   const modelInputShape = [1, 3, 640, 640];
   const topk = 100;
   const iouThreshold = 0.45;
   const scoreThreshold = 0.2;
   ...
   ```
4. Done! 😊

**Note: Custom Trained YOLOv8 Segmentation Models**

Please update `src/utils/labels.json` with your YOLOv8 Segmentation classes.

## Reference

- https://github.com/ultralytics/ultralytics
- https://github.com/Hyuto/yolov8-onnxruntime-web
- https://github.com/Hyuto/yolov5-seg-onnxruntime-web
