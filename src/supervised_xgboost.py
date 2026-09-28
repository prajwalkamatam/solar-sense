import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error
import numpy as np
import joblib

def main():
    print("--- Starting Supervised Yield Prediction (XGBoost) ---")
    
    # 1. Load Data
    data_path = '../data/solar_telemetry.csv'
    try:
        df = pd.read_csv(data_path)
        print(f"Loaded {len(df)} rows from {data_path}")
    except FileNotFoundError:
        print(f"Error: Could not find {data_path}. Please run this from the src/ directory.")
        return

    # Drop any nulls just in case
    df = df.dropna()

    # 2. Feature Selection
    features = ['hour_of_day', 'ambient_temp_c', 'module_temp_c', 'solar_irradiance_w_m2', 'cloud_cover_pct']
    target = 'energy_yield_kwh'
    
    X = df[features]
    y = df[target]

    # 3. Train/Test Split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # 4. Initialize and Train XGBoost
    model = xgb.XGBRegressor(
        n_estimators=100,
        learning_rate=0.1,
        max_depth=5,
        random_state=42
    )
    
    print("Training XGBoost Regressor...")
    model.fit(X_train, y_train)

    # 5. Evaluate the Model
    predictions = model.predict(X_test)
    mae = mean_absolute_error(y_test, predictions)
    rmse = np.sqrt(mean_squared_error(y_test, predictions))
    
    print(f"Model Evaluation -> MAE: {mae:.4f} | RMSE: {rmse:.4f}")

    # 6. Generate Expectations for the entire dataset
    df['expected_yield_kwh'] = model.predict(X)
    
    # The 'residual' is how far off actual was from expected
    # Negative residual means underperformance (potential degradation)
    df['efficiency_residual'] = df['energy_yield_kwh'] - df['expected_yield_kwh']
    
    # 7. Save Outputs for the Unsupervised Pipeline
    output_path = '../data/telemetry_with_predictions.csv'
    df.to_csv(output_path, index=False)
    print(f"Saved dataset with expected yields and residuals to {output_path}")
    
    # Save Model
    model_path = '../models/xgboost_yield_model.pkl'
    joblib.dump(model, model_path)
    print(f"Saved XGBoost model to {model_path}")

if __name__ == "__main__":
    main()
