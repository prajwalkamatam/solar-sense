import urllib.request
import json

def main():
    print("=" * 50)
    print("☀️  SolarSense Interactive Yield Predictor  ☀️")
    print("=" * 50)
    print("Enter the weather and time conditions below to test the live API.")
    print("(Press ENTER to use the default values)\n")
    
    try:
        # Prompt user for inputs, falling back to realistic defaults
        h_input = input("Hour of day (0-23) [Default: 12]: ")
        hour = int(h_input) if h_input.strip() else 12
        
        at_input = input("Ambient Temperature (°C) [Default: 22.5]: ")
        amb_temp = float(at_input) if at_input.strip() else 22.5
        
        mt_input = input("Module Temperature (°C) [Default: 26.0]: ")
        mod_temp = float(mt_input) if mt_input.strip() else 26.0
        
        si_input = input("Solar Irradiance (W/m2) [Default: 750.0]: ")
        irradiance = float(si_input) if si_input.strip() else 750.0
        
        cc_input = input("Cloud Cover (%) [Default: 15.0]: ")
        cloud = float(cc_input) if cc_input.strip() else 15.0
        
    except ValueError:
        print("\n❌ Error: Please enter valid numbers.")
        return

    # Prepare JSON payload matching our FastAPI schema
    payload = {
        "hour_of_day": hour,
        "ambient_temp_c": amb_temp,
        "module_temp_c": mod_temp,
        "solar_irradiance_w_m2": irradiance,
        "cloud_cover_pct": cloud
    }

    print("\n⏳ Sending data to FastAPI Backend (http://127.0.0.1:8000/predict)...")
    
    # Send HTTP POST request
    try:
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(
            "http://127.0.0.1:8000/predict", 
            data=data, 
            headers={'Content-Type': 'application/json'}
        )
        
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode())
            
            print("\n" + "=" * 30)
            print("✅ PREDICTION RESULT")
            print("=" * 30)
            print(f"Based on those weather conditions, the solar panels")
            print(f"are expected to generate: {result['expected_yield_kwh']} kWh")
            print("=" * 30 + "\n")
            
    except Exception as e:
        print(f"\n❌ Error connecting to the API: {e}")
        print("Please make sure the backend is running (uvicorn src.api:app).")

if __name__ == "__main__":
    main()
