import cv2
import numpy as np
import os
from tkinter import Tk, filedialog

def detect_water_logging(image_path):
    if not os.path.exists(image_path):
        print("❌ Image path does not exist")
        return

    img = cv2.imread(image_path)
    if img is None:
        print("❌ Unable to read image")
        return

    img = cv2.resize(img, (640, 420))

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    laplacian = cv2.Laplacian(gray, cv2.CV_64F)
    texture = np.abs(laplacian)

    texture_norm = cv2.normalize(texture, None, 0, 255, cv2.NORM_MINMAX)
    texture_norm = texture_norm.astype(np.uint8)

    _, smooth_mask = cv2.threshold(texture_norm, 25, 255, cv2.THRESH_BINARY_INV)
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

    if water_ratio > 0.18:
        result = "WATER LOGGING DETECTED"
        color = (0, 0, 255)
    else:
        result = "NO WATER LOGGING"
        color = (0, 255, 0)

    output = img.copy()
    cv2.putText(output, result, (20, 40),
                cv2.FONT_HERSHEY_SIMPLEX, 1, color, 2)

    print("\n📊 Water Ratio:", round(water_ratio, 2))
    print("✅ Result:", result)

    cv2.imshow("Water Logging Detection", output)
    cv2.waitKey(0)
    cv2.destroyAllWindows()


# ================= MAIN =================
if __name__ == "__main__":
    print("📷 WATER LOGGING DETECTOR")

    # Hide root tkinter window
    root = Tk()
    root.withdraw()

    # Open file dialog (Downloads, Desktop, etc.)
    image_path = filedialog.askopenfilename(
        title="Select an image",
        filetypes=[("Image Files", "*.jpg *.jpeg *.png* .webp *.bmp")],
    )

    if image_path:
        detect_water_logging(image_path)
    else:
        print("❌ No image selected")