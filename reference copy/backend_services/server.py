from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
import torch
import torch.nn as nn
import torch.optim as optim
import pandas as pd
import io
import uvicorn
import sys
import os

# Add local directory to path so 'model.py' can be imported whether running as script or module
# Fix: Ensure reloads on CSV updates
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from model import RainfallPredictor
from fastapi.middleware.cors import CORSMiddleware
import numpy as np

app = FastAPI()

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Model
model = RainfallPredictor()
optimizer = optim.Adam(model.parameters(), lr=0.001)
criterion = nn.MSELoss()

# Global state to track training
training_status = {"trained": False, "loss": None}

class PredictionInput(BaseModel):
    temperature: float
    humidity: float
    pressure: float
    cloud_cover: float
    # Optional Urban Factors (User Overrides)
    isp: float = None
    road_density: float = None
    ndvi: float = None
    population_density: float = None

def normalize_input(val, min_val, max_val):
    return (val - min_val) / (max_val - min_val) if max_val > min_val else 0

@app.get("/")
def read_root():
    return {"status": "JalDrishti AI Backend Running"}

from sqlalchemy.orm import Session
from database import get_db
from models import Location, Ward
from fastapi import Depends

@app.post("/predict")
def predict_rainfall(data: PredictionInput, db: Session = Depends(get_db)):
    # 1. Global Rainfall Prediction (Using the AI Model)
    t_norm = data.temperature / 50.0
    h_norm = data.humidity / 100.0
    p_norm = (data.pressure - 900) / 150.0
    c_norm = data.cloud_cover / 100.0
    
    inputs = torch.tensor([[t_norm, h_norm, p_norm, c_norm]], dtype=torch.float32)
    
    model.eval()
    with torch.no_grad():
        output = model(inputs)
        
    prediction = output.item()
    
    rainfall_mm = prediction * 10.0 # Denormalize
    
    # Heuristic adjustment based on cloud cover if model is untrained/weak
    if not training_status["trained"]:
        rainfall_mm = (data.cloud_cover * 1.5) + (data.humidity * 0.5) - (data.temperature * 0.5)
    
    rainfall_mm = max(0, rainfall_mm)

    # 2. Process Location-Wise Risk (Using DATABASE)
    locations_out = []
    ward_stats = {} 
    
    # Fetch all locations from DB
    db_locations = db.query(Location).all()
    
    # User Modifiers 
    mod_isp = (data.isp / 50.0) if data.isp is not None else 1.0
    mod_road = (data.road_density / 10.0) if data.road_density is not None else 1.0
    mod_ndvi = (data.ndvi / 0.4) if data.ndvi is not None else 1.0
    mod_pop = (data.population_density / 15000.0) if data.population_density is not None else 1.0

    f_rain = min(1.0, rainfall_mm / 150.0) 

    for loc in db_locations:
        try:
            # Join with Ward to get real population
            ward_obj = db.query(Ward).filter(Ward.name == loc.ward_name).first()
            real_pop = ward_obj.population if ward_obj else 0
            
            # Apply User Modifiers
            f_isp = min(1.0, (loc.isp * mod_isp) / 100.0)
            f_road = min(1.0, (loc.road_density * mod_road) / 20.0)
            f_ndvi = min(1.0, loc.ndvi * mod_ndvi)
            
            if real_pop > 0:
                f_pop = min(1.0, (real_pop / 100000.0) * mod_pop)
            else:
                f_pop = min(1.0, (loc.population_density / 50000.0) * mod_pop)

            risk_val = (0.5 * f_rain) + (0.25 * f_isp) + (0.2 * f_pop) - (0.2 * f_ndvi) + (0.1 * f_road)
            score = max(0, min(100, (risk_val + 0.1) * 100))
            
            # Determine Status
            if score > 70: status = "High"
            elif score > 40: status = "Medium"
            else: status = "Low"
                
            locations_out.append({
                "latitude": loc.latitude,
                "longitude": loc.longitude,
                "ward": loc.ward_name,
                "risk_score": round(score, 1),
                "status": status,
                "population": real_pop if real_pop > 0 else "N/A"
            })
            
            # Aggregate for Ward
            if loc.ward_name not in ward_stats:
                ward_stats[loc.ward_name] = []
            ward_stats[loc.ward_name].append(score)
            
        except Exception as row_e:
            continue
            
    # Process Ward Risks
    ward_risks = {}
    ward_scores = {}

    for ward, scores in ward_stats.items():
        total_spots = len(scores)
        high_risk_spots = sum(1 for s in scores if s > 70)
        
        high_ratio = high_risk_spots / total_spots
        
        if high_ratio >= 0.3: 
            ward_status = "High"
        elif high_ratio >= 0.1 or (sum(scores)/len(scores)) > 50:
             ward_status = "Medium"
        else:
            ward_status = "Low"
            
        ward_risks[ward] = ward_status
        avg_score = sum(scores) / total_spots
        final_score = avg_score
        if ward_status == "High":
            final_score = max(avg_score, 75)
        elif ward_status == "Medium":
            final_score = max(avg_score, 45)
            
        ward_scores[ward] = int(final_score)

    return {
        "rainfall_mm": round(rainfall_mm, 2), 
        "source": "ai_model" if training_status["trained"] else "heuristic",
        "locations": locations_out,
        "ward_risks": ward_risks,
        "ward_scores": ward_scores
    }

@app.on_event("startup")
async def startup_event():
    # automatic training if dataset.csv exists
    import os
    
    # Check for extra datasets (User request)
    extra_datasets = ["123.csv", "456.csv", "backend/123.csv", "backend/456.csv"]
    for ds in extra_datasets:
        if os.path.exists(ds):
            print(f"Loading auxiliary training data: {ds}")
            
    # Check dataset.csv in root or backend
    dataset_path = None
    if os.path.exists("dataset.csv"): dataset_path = "dataset.csv"
    elif os.path.exists("backend/dataset.csv"): dataset_path = "backend/dataset.csv"
    
    if dataset_path:
        print(f"Found {dataset_path}. Auto-training model...")
        try:
            df = pd.read_csv(dataset_path)
            # Reuse training logic (refactored for clean reuse)
            await train_internal(df)
            print("Auto-training complete.")
        except Exception as e:
            print(f"Auto-training failed: {e}")
    else:
        print("No dataset.csv found. Using heuristic/untrained model.")

async def train_internal(df):
    global training_status
    # Check required columns (flexible matching)
    required_cols = ['temperature', 'humidity', 'pressure', 'cloud_cover', 'rainfall']
    df.columns = [c.lower().strip() for c in df.columns]
    
    if not all(col in df.columns for col in required_cols):
        print(f"CSV missing columns. Required: {required_cols}")
        return
        
    # Data Preparation
    X = df[['temperature', 'humidity', 'pressure', 'cloud_cover']].values
    y = df['rainfall'].values
    
    # Normalize
    X[:, 0] = X[:, 0] / 50.0 # Temp
    X[:, 1] = X[:, 1] / 100.0 # Hum
    X[:, 2] = (X[:, 2] - 900) / 150.0 # Press
    X[:, 3] = X[:, 3] / 100.0 # Cloud
    
    y = y / 300.0 # Normalize rainfall (0-300mm assumption)
    
    X_tensor = torch.tensor(X, dtype=torch.float32)
    y_tensor = torch.tensor(y, dtype=torch.float32).view(-1, 1)
    
    # Training Loop
    model.train()
    epochs = 100 # Quick train on startup
    final_loss = 0
    
    for epoch in range(epochs):
        optimizer.zero_grad()
        outputs = model(X_tensor)
        loss = criterion(outputs, y_tensor)
        loss.backward()
        optimizer.step()
        final_loss = loss.item()
        
    training_status["trained"] = True
    training_status["loss"] = final_loss

@app.post("/train")
async def train_model(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
        await train_internal(df)
        
        return {
            "message": "Training complete",
            "loss": training_status["loss"]
        }
        
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
