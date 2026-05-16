# Spec: Art Tracker Image Processing Tool

## Goal
Integrate the "Scan-Flat" processing logic directly into the Mission Control Art Tracker. This will allow Tom to upload a studio photo and have it automatically straightened, cropped, and archived in Hi-Res (5K) format.

## Requirements
- **Input**: Raw photo upload (studio shot on easel).
- **Processing**:
    - Automatic or manual corner detection (quad-transform).
    - Aspect ratio preservation based on physical painting dimensions (from database).
    - Tonal correction (optional toggle).
    - Upscaling to 5K resolution.
    - Optimization to stay under 5MB (JPEG compression loop).
- **Output**: 
    - Master file stored in `artwork-archive/master-scans/`.
    - Hi-Res file stored in `artwork-archive/HiRes/`.
    - Database entry updated with the new image URL.

## Architecture
- **Backend**: Python script (`deskew_painting.py` logic) exposed via a local API route.
- **Frontend**: A "Process Master Image" modal in the Art Tracker Dashboard.
- **Library**: Use `Pillow` (PIL) for the core transformations.

---
*Muffin 🧁 - Nightly Plan*