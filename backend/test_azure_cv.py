
import os
from azure.cognitiveservices.vision.computervision import ComputerVisionClient
from msrest.authentication import CognitiveServicesCredentials
from azure.cognitiveservices.vision.computervision.models import VisualFeatureTypes
from dotenv import load_dotenv

load_dotenv()

key = os.getenv("AZURE_CV_KEY") or os.getenv("AZURE_COMPUTER_VISION_KEY")
endpoint = os.getenv("AZURE_CV_ENDPOINT") or os.getenv("AZURE_COMPUTER_VISION_ENDPOINT")

print(f"Key: {key[:5]}... (Len: {len(key) if key else 0})")
print(f"Endpoint: {endpoint}")

if not key or not endpoint:
    print("Error: Missing credentials")
    exit(1)

client = ComputerVisionClient(endpoint, CognitiveServicesCredentials(key))

try:
    print("Attempting to analyze remote image...")
    # diverse image of water
    url = "https://images.unsplash.com/photo-1438283173091-5dbf5c5a3206" 
    analysis = client.analyze_image(url, visual_features=[VisualFeatureTypes.tags, VisualFeatureTypes.description])
    print("Success!")
    print("Tags:", [t.name for t in analysis.tags][:5])
except Exception as e:
    print("Error during analysis:")
    print(e)
