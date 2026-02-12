# Public Assets

This folder contains static files that are served directly without processing.

## opencv.js

**Source:** Official OpenCV CDN (https://docs.opencv.org/4.5.5/opencv.js)  
**Size:** ~8.6 MB  
**Purpose:** Computer vision library used for image preprocessing before YOLO inference

The file is loaded dynamically by `src/hooks/useOpenCV.ts` when needed.

### Why local instead of CDN?

- ✅ No external dependencies
- ✅ Works offline
- ✅ Better privacy (no third-party requests)
- ✅ Faster loading (same origin, HTTP/2)
- ✅ Deterministic caching

### Updating

To update to a newer version:

```bash
# Download from OpenCV CDN
Invoke-WebRequest -Uri "https://docs.opencv.org/4.5.5/opencv.js" -OutFile "public/opencv.js"

# Or use curl on Unix systems
curl -o public/opencv.js https://docs.opencv.org/4.5.5/opencv.js
```
