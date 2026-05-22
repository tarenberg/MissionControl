import cv2
import numpy as np
import os
import sys
import json
from PIL import Image

def get_size_format(b, factor=1024, suffix="B"):
    """
    Scale bytes to its proper format
    """
    for unit in ["", "K", "M", "G", "T", "P"]:
        if b < factor:
            return f"{b:.2f}{unit}{suffix}"
        b /= factor

def order_points(pts):
    """
    Order points as TL, TR, BR, BL
    """
    pts = np.array(pts, dtype="float32")
    # Sort by x coordinate
    x_sorted = pts[np.argsort(pts[:, 0]), :]
    left_two = x_sorted[:2, :]
    right_two = x_sorted[2:, :]
    
    # Sort left two by y coordinate (TL is top, BL is bottom)
    TL = left_two[np.argmin(left_two[:, 1])]
    BL = left_two[np.argmax(left_two[:, 1])]
    
    # Sort right two by y coordinate (TR is top, BR is bottom)
    TR = right_two[np.argmin(right_two[:, 1])]
    BR = right_two[np.argmax(right_two[:, 1])]
    
    return [TL.tolist(), TR.tolist(), BR.tolist(), BL.tolist()]

def auto_detect_corners(image_path):
    """
    Find rectangular canvas using contour processing
    """
    img = cv2.imread(image_path)
    if img is None:
        return None
    
    orig_h, orig_w = img.shape[:2]
    
    # Scale down for faster contour extraction
    max_dim = 1000
    scale = 1.0
    if max(orig_h, orig_w) > max_dim:
        scale = max_dim / max(orig_h, orig_w)
        resized = cv2.resize(img, (int(orig_w * scale), int(orig_h * scale)))
    else:
        resized = img.copy()
        
    gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    
    # Thresholding and Edge extraction
    _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    edged = cv2.Canny(thresh, 50, 150)
    
    # Close gaps
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    dilated = cv2.dilate(edged, kernel, iterations=1)
    
    contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    contours = sorted(contours, key=cv2.contourArea, reverse=True)
    
    for c in contours:
        peri = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.02 * peri, True)
        
        # If polygon has 4 points and is reasonably large (e.g., > 5% of scaled image area)
        if len(approx) == 4 and cv2.contourArea(c) > (resized.shape[0] * resized.shape[1] * 0.05):
            pts = approx.reshape(4, 2) / scale
            return order_points(pts)
            
    # Default fallback: 5% inner margin
    margin_w = int(orig_w * 0.05)
    margin_h = int(orig_h * 0.05)
    fallback = [
        [margin_w, margin_h],
        [orig_w - margin_w, margin_h],
        [orig_w - margin_w, orig_h - margin_h],
        [margin_w, orig_h - margin_h]
    ]
    return fallback

def process_scan(image_path, output_dir, corners_input, target_ratio=None, target_width=5000):
    # If corners is "auto" or empty list, detect corners automatically
    detected_automatically = False
    if corners_input == "auto" or not isinstance(corners_input, list) or len(corners_input) != 4:
        corners = auto_detect_corners(image_path)
        detected_automatically = True
    else:
        corners = corners_input

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
        "quality": quality,
        "corners": corners,
        "detected_automatically": detected_automatically
    }

if __name__ == "__main__":
    if len(sys.argv) < 5:
        print(json.dumps({"error": "Usage: scan_engine.py <img_path> <out_dir> <corners_json_or_auto> <ratio>"}))
        sys.exit(1)

    img_path = sys.argv[1]
    out_dir = sys.argv[2]
    
    # Resilient corners input loading
    corners_arg = sys.argv[3]
    try:
        corners = json.loads(corners_arg)
    except Exception:
        corners = corners_arg # Fallback to string e.g., "auto"

    ratio = float(sys.argv[4]) if sys.argv[4] != "None" else None

    result = process_scan(img_path, out_dir, corners, ratio)
    print(json.dumps(result))
