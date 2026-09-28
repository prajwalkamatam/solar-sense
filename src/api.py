from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import pandas as pd
import os
import asyncio
from datetime import datetime, timedelta
import math
import random

app = FastAPI(
    title="SolarSense Live AI Backend", 
    description="Real-time Simulator for AI Predictive Solar Monitoring"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = "../models/xgboost_yield_model.pkl"
model = None

# --- In-Memory State for the Simulator ---
live_telemetry = []
live_anomalies = []
sim_time = datetime.now().replace(hour=6, minute=0, second=0, microsecond=0)

async def run_simulator():
    """
    Background task that generates mathematically realistic solar data every 3 seconds.
    It advances time by 1 hour per tick, allowing presenters to show a full day cycle in ~1 minute.
    """
    global sim_time, live_telemetry, live_anomalies, model
    
    # Wait for model to load
    while model is None:
        await asyncio.sleep(1)
        
    while True:
        await asyncio.sleep(3) # Generate new data every 3 seconds
        
        sim_time += timedelta(hours=1)
        hour = sim_time.hour
        
        # 1. Simulate Environmental Physics
        if 6 <= hour <= 18:
            # Irradiance curve peaking at solar noon (12:00)
            base_irradiance = 1000 * math.cos((hour - 12) * math.pi / 12)
            irradiance = max(0.0, base_irradiance + random.uniform(-50, 100))
        else:
            irradiance = 0.0
            
        # Temperature curve peaking around 2:00 PM
        temp_c = 22.0 + 12.0 * math.cos((hour - 14) * math.pi / 12) + random.uniform(-2, 2)
        
        # Cloud cover (more random)
        cloud_pct = random.uniform(0, 30) if irradiance > 0 else random.uniform(0, 100)
        
        # 2. Ask the XGBoost ML Model for the "Expected" Baseline Yield
        input_df = pd.DataFrame([{
            'hour_of_day': hour,
            'ambient_temp_c': temp_c,
            'module_temp_c': temp_c + 2.0,
            'solar_irradiance_w_m2': irradiance,
            'cloud_cover_pct': cloud_pct
        }])
        
        expected = float(model.predict(input_df)[0])
        expected = max(0.0, expected)
        
        # 3. Generate "Actual" Yield & Simulate Anomalies
        actual = expected * random.uniform(0.97, 1.02) # Normal physical variance
        
        # Inject 8% chance of a severe anomaly (Hardware degradation/soiling simulation)
        is_anomaly = False
        if expected > 1.0 and random.random() < 0.08:
            actual = expected * random.uniform(0.4, 0.6) # Huge 40-60% efficiency drop!
            is_anomaly = True
            
        residual = actual - expected
        
        data_point = {
            "timestamp": sim_time.isoformat(),
            "hour_of_day": hour,
            "expected_yield_kwh": expected,
            "energy_yield_kwh": actual,
            "efficiency_residual": residual
        }
        
        # Update Telemetry Array (keep last 24 hours)
        live_telemetry.append(data_point)
        if len(live_telemetry) > 24:
            live_telemetry.pop(0)
            
        # Update Anomalies Array
        if is_anomaly:
            # Add fake DBSCAN context for the frontend
            data_point["panel_id"] = f"P-{random.randint(1, 12)}"
            live_anomalies.insert(0, data_point)
            if len(live_anomalies) > 8:
                live_anomalies.pop()

@app.on_event("startup")
async def startup_event():
    global model
    if os.path.exists(MODEL_PATH):
        model = joblib.load(MODEL_PATH)
        print("XGBoost Model loaded successfully.")
    else:
        print("Warning: Model not found!")
    
    # Start the continuous simulator
    asyncio.create_task(run_simulator())

class WeatherData(BaseModel):
    hour_of_day: int
    ambient_temp_c: float
    module_temp_c: float
    solar_irradiance_w_m2: float
    cloud_cover_pct: float

@app.post("/predict")
def predict_yield(data: WeatherData):
    if model is None: raise HTTPException(status_code=500, detail="ML Model missing")
    input_df = pd.DataFrame([data.dict()])
    expected = max(0.0, float(model.predict(input_df)[0]))
    return {"expected_yield_kwh": round(expected, 3)}

@app.get("/anomalies")
def get_anomalies():
    return {"anomalies": live_anomalies}

@app.get("/telemetry")
def get_recent_telemetry(limit: int = 24):
    return {"telemetry": live_telemetry[-limit:]}
