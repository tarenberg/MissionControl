import cv2
import numpy as np
import os
import sys
import json
from PIL import Image

def get_size_format(b, factor=1024, suffix="B"):
    """
    Scale bytes to its proper format
    e.g:
        1253656 => '1.20MB'
        1253656678 => '1.17GB'
    """
    for unit in ["", "K", "M", "G", "T", "P"]:
        if b < factor:
            return f"{b:.2f}{unit}{suffix}"
        b /= factor

def process_scan(image_path, output_dir, corners, target_ratio=None, target_width=5000):
    # corners: [[x,y], [x,y], [x,y], [x,y]] -> TL, TR, BR, BL
    img = cv2.imread(image_path)
    if img is None:
        return {"error": "Could not read image"}

    # Source points
    src_pts = np.array(corners, dtype="float32")

    # Destination points
    # If no ratio, calculate from average distance
    if not target_ratio:
        w1 = np.sqrt((corners[1][0] - corners[0][0])**2 + (corners[1][1] - corners[0][1])**2)
        w2 = np.sqrt((corners[2][0] - corners[3][0])**2 + (corners[2][1] - corners[3][1])**2)
        h1 = np.sqrt((corners[3][0] - corners[0][0])**2 + (corners[3][1] - corners[0][1])**2)
        h2 = np.sqrt((corners[2][0] - corners[1][0])**2 + (corners[2][1] - corners[1][1])**2)
        target_ratio = max(w1, w2) / max(h1, h2)

    dst_w = target_width
    dst_h = int(dst_w / target_ratio)

    dst_pts = np.array([
        [0, 0],
        [dst_w - 1, 0],
        [dst_w - 1, dst_h - 1],
        [0, dst_h - 1]
    ], dtype="float32")

    # Transform matrix
    M = cv2.getPerspectiveTransform(src_pts, dst_pts)
    warped = cv2.warpPerspective(img, M, (dst_w, dst_h), flags=cv2.INTER_LANCZOS4)

    # Convert to PIL for quality-controlled saving
    warped_rgb = cv2.cvtColor(warped, cv2.COLOR_BGR2RGB)
    pil_img = Image.fromarray(warped_rgb)

    # Filename handling
    base_name = os.path.splitext(os.path.basename(image_path))[0]
    output_filename = f"{base_name}_HiRes.jpg"
    output_path = os.path.join(output_dir, output_filename)

    # JPEG Quality Loop (Target < 5MB)
    quality = 98
    while quality > 50:
        pil_img.save(output_path, "JPEG", quality=quality, subsampling=0)
        size = os.path.getsize(output_path)
        if size <= 5000000: # 5MB
            break
        quality -= 2

    return {
        "success": True,
        "path": output_path,
        "width": dst_w,
        "height": dst_h,
        "size": size,
        "size_readable": get_size_format(size),
        "quality": quality
    }

if __name__ == "__main__":
    if len(sys.argv) < 5:
        print(json.dumps({"error": "Usage: scan_engine.py <img_path> <out_dir> <corners_json> <ratio>"}))
        sys.exit(1)

    img_path = sys.argv[1]
    out_dir = sys.argv[2]
    corners = json.loads(sys.argv[3])
    ratio = float(sys.argv[4]) if sys.argv[4] != "None" else None

    result = process_scan(img_path, out_dir, corners, ratio)
    print(json.dumps(result))
