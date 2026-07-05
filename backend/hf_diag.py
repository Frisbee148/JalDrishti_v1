"""Standalone HF inference diagnostic. Run: python backend/hf_diag.py path/to/image.jpg
Prints the exact error so we stop guessing which layer fails."""
import sys, os, traceback
from dotenv import load_dotenv
load_dotenv()

from huggingface_hub import InferenceClient

img_path = sys.argv[1] if len(sys.argv) > 1 else None
if not img_path or not os.path.exists(img_path):
    # fall back to any uploaded image
    up = "backend/static/uploads"
    imgs = [f for f in os.listdir(up)] if os.path.exists(up) else []
    img_path = os.path.join(up, imgs[0]) if imgs else None
print("Image:", img_path)

token = os.getenv("HF_TOKEN")
print("HF_TOKEN present:", bool(token), "len:", len(token) if token else 0)

with open(img_path, "rb") as f:
    data = f.read()

labels = ["a flooded waterlogged street with standing water", "a dry street"]
models = [
    "google/siglip2-so400m-patch14-384",
    "openai/clip-vit-base-patch32",
]

# Try default provider, then pinned hf-inference
for provider in [None, "hf-inference"]:
    print("\n=== provider:", provider, "===")
    try:
        client = InferenceClient(token=token, provider=provider) if provider else InferenceClient(token=token)
    except Exception as e:
        print("client construct failed:", type(e).__name__, repr(e)); continue
    for m in models:
        try:
            r = client.zero_shot_image_classification(data, candidate_labels=labels, model=m)
            print(f"  OK {m}: {[(x.label[:20], round(x.score,3)) for x in r]}")
        except Exception as e:
            status = getattr(getattr(e, "response", None), "status_code", None)
            print(f"  FAIL {m} [{type(e).__name__} status={status}]: {repr(e)[:300]}")
