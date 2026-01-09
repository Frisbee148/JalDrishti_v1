import cv2
import numpy as np
import os
import sys
import json

def detect_water_logging(image_path):
    if not os.path.exists(image_path):
        return {"error": "Image path does not exist"}

    img = cv2.imread(image_path)
    if img is None:
        return {"error": "Unable to read image"}

    img = cv2.resize(img, (640, 420))

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    laplacian = cv2.Laplacian(gray, cv2.CV_64F)
    texture = np.abs(laplacian)

    texture_norm = cv2.normalize(texture, None, 0, 255, cv2.NORM_MINMAX)
    texture_norm = texture_norm.astype(np.uint8)

    # Smooth areas (low texture)
    _, smooth_mask = cv2.threshold(texture_norm, 25, 255, cv2.THRESH_BINARY_INV)
    
    # Exclude very bright areas (likely sky or reflections)
    _, bright_mask = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY_INV)

    water_candidate = cv2.bitwise_and(smooth_mask, bright_mask)

    kernel = np.ones((7, 7), np.uint8)
    water_candidate = cv2.morphologyEx(water_candidate, cv2.MORPH_CLOSE, kernel)
    water_candidate = cv2.morphologyEx(water_candidate, cv2.MORPH_OPEN, kernel)

    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(
        water_candidate, connectivity=8
    )

    water_mask = np.zeros_like(gray)

    for i in range(1, num_labels):
        if stats[i, cv2.CC_STAT_AREA] > 5000:
            water_mask[labels == i] = 255

    water_pixels = cv2.countNonZero(water_mask)
    total_pixels = gray.shape[0] * gray.shape[1]
    water_ratio = water_pixels / total_pixels

    has_water = water_ratio > 0.18
        
    return {
        "water_ratio": round(water_ratio, 2),
        "has_water": bool(has_water),
        "result": "WATER LOGGING DETECTED" if has_water else "NO WATER LOGGING"
    }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No image path provided"}))
        sys.exit(1)
    
    image_path = sys.argv[1]
    result = detect_water_logging(image_path)
    print(json.dumps(result))