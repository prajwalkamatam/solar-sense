const fs = require('fs');
let code = fs.readFileSync('frontend/src/App.jsx', 'utf8');

code = code.replace(
  "const [cloudCover, setCloudCover] = useState(12);",
  "const [cloudCover, setCloudCover] = useState(12);\n\n  // Added state for unsupervised testing\n  const [actualYield, setActualYield] = useState(\"\");\n  const [anomalyFlag, setAnomalyFlag] = useState(null);"
);

const handlePredictOld = `  // Handle Prediction Submit
  const handlePredict = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(\`\${API_BASE}/predict\`, {
        hour_of_day: hour,
        ambient_temp_c: temperature,
        module_temp_c: temperature + 3, // basic estimation for module temp
        solar_irradiance_w_m2: irradiance,
        cloud_cover_pct: cloudCover
      });
      
      const predicted = res.data.expected_yield_kwh;
      setPredictedYield(predicted);

      if (predicted >= 4.1) {
        setPredictionState({
          text: "High production window",
          className: "mt-4 inline-flex rounded-full bg-[#e3f1df] px-3 py-1.5 text-xs font-bold text-[#286b4b]",
          explanation: "Strong conditions indicate that the XGBoost model expects efficient solar generation."
        });
      } else if (predicted >= 1.7) {
        setPredictionState({
          text: "Moderate production window",
          className: "mt-4 inline-flex rounded-full bg-[#fff1cf] px-3 py-1.5 text-xs font-bold text-[#886211]",
          explanation: "Available sunlight should support generation, though environmental conditions limit peak output."
        });
      } else {
        setPredictionState({
          text: "Low production window",
          className: "mt-4 inline-flex rounded-full bg-[#f9e1dc] px-3 py-1.5 text-xs font-bold text-[#a94432]",
          explanation: "Low daylight, high cloud cover, or limited irradiance is expected to suppress production."
        });
      }
    } catch (err) {
      console.error("Prediction API failed", err);
    }
  };`;

const handlePredictNew = `  // Handle Prediction Submit
  const handlePredict = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(\`\${API_BASE}/predict\`, {
        hour_of_day: hour,
        ambient_temp_c: temperature,
        module_temp_c: temperature + 3, // basic estimation for module temp
        solar_irradiance_w_m2: irradiance,
        cloud_cover_pct: cloudCover
      });
      
      const predicted = res.data.expected_yield_kwh;
      setPredictedYield(predicted);

      if (predicted >= 4.1) {
        setPredictionState({
          text: "High production window",
          className: "mt-4 inline-flex rounded-full bg-[#e3f1df] px-3 py-1.5 text-xs font-bold text-[#286b4b]",
          explanation: "Strong conditions indicate that the XGBoost model expects efficient solar generation."
        });
      } else if (predicted >= 1.7) {
        setPredictionState({
          text: "Moderate production window",
          className: "mt-4 inline-flex rounded-full bg-[#fff1cf] px-3 py-1.5 text-xs font-bold text-[#886211]",
          explanation: "Available sunlight should support generation, though environmental conditions limit peak output."
        });
      } else {
        setPredictionState({
          text: "Low production window",
          className: "mt-4 inline-flex rounded-full bg-[#f9e1dc] px-3 py-1.5 text-xs font-bold text-[#a94432]",
          explanation: "Low daylight, high cloud cover, or limited irradiance is expected to suppress production."
        });
      }

      // Check DBSCAN threshold if actual yield is provided
      if (actualYield !== "") {
          const actual = parseFloat(actualYield);
          if (!isNaN(actual)) {
             const drop = ((predicted - actual) / predicted) * 100;
             if (predicted > 1.0 && drop > 25) {
                 setAnomalyFlag({
                     isAnomaly: true,
                     text: \`⚠️ DBSCAN FLAG: \${drop.toFixed(0)}% efficiency drop detected. Anomaly recorded!\`,
                     className: "mt-4 p-3 rounded-lg bg-[#f9dfda] border border-[#e1b9b1] text-[#aa4131] text-sm font-bold"
                 });
             } else {
                 setAnomalyFlag({
                     isAnomaly: false,
                     text: \`✅ Panel Healthy: Residuals within normal clustering distribution.\`,
                     className: "mt-4 p-3 rounded-lg bg-[#e3f1df] border border-[#c4e0bc] text-[#286b4b] text-sm font-bold"
                 });
             }
          }
      } else {
          setAnomalyFlag(null);
      }
    } catch (err) {
      console.error("Prediction API failed", err);
    }
  };`;

code = code.replace(handlePredictOld, handlePredictNew);

const formOld = `                <div>
                  <label className="mb-2 block text-sm font-bold text-[#10261f]">Cloud Cover</label>
                  <div className="relative">
                    <input 
                      type="number" min="0" max="100" 
                      value={cloudCover} onChange={(e) => setCloudCover(Number(e.target.value))} 
                      className="w-full rounded-xl border border-[#cad9c5] bg-[#fbfdf9] px-4 py-3 pr-12 text-sm font-semibold text-[#10261f] transition focus:border-[#2d7a55] outline-none" 
                    /> 
                    <span className="pointer-events-none absolute right-4 top-3.5 text-sm font-bold text-[#60756e]">%</span>
                  </div>
                </div>

                <button 
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2d7a55] text-white px-4 py-3.5 font-bold transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#2d7a55]/20" 
                  type="submit"
                > 
                  <Zap className="h-4 w-4" aria-hidden="true" /> 
                  <span>Run XGBoost Model</span> 
                </button>`;

const formNew = `                <div>
                  <label className="mb-2 block text-sm font-bold text-[#10261f]">Cloud Cover</label>
                  <div className="relative">
                    <input 
                      type="number" min="0" max="100" 
                      value={cloudCover} onChange={(e) => setCloudCover(Number(e.target.value))} 
                      className="w-full rounded-xl border border-[#cad9c5] bg-[#fbfdf9] px-4 py-3 pr-12 text-sm font-semibold text-[#10261f] transition focus:border-[#2d7a55] outline-none" 
                    /> 
                    <span className="pointer-events-none absolute right-4 top-3.5 text-sm font-bold text-[#60756e]">%</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#dfe9da]">
                  <label className="mb-1 block text-sm font-bold text-[#10261f]">Test DBSCAN (Optional)</label>
                  <p className="mb-2 text-xs text-[#60756e]">Enter an observed actual yield to test if the unsupervised model flags it as degradation.</p>
                  <div className="relative">
                    <input 
                      type="number" step="0.01" min="0"
                      placeholder="e.g. 1.20"
                      value={actualYield} onChange={(e) => setActualYield(e.target.value)} 
                      className="w-full rounded-xl border border-[#cad9c5] bg-[#fbfdf9] px-4 py-3 pr-12 text-sm font-semibold text-[#10261f] transition focus:border-[#2d7a55] outline-none" 
                    /> 
                    <span className="pointer-events-none absolute right-4 top-3.5 text-sm font-bold text-[#60756e]">kWh</span>
                  </div>
                </div>

                <button 
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2d7a55] text-white px-4 py-3.5 font-bold transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#2d7a55]/20" 
                  type="submit"
                > 
                  <Zap className="h-4 w-4" aria-hidden="true" /> 
                  <span>Run Analysis</span> 
                </button>`;

code = code.replace(formOld, formNew);

const expectedOld = `              <p className="mt-3 text-sm leading-relaxed text-[#60756e]" aria-live="polite">
                {predictionState.explanation}
              </p>
            </section>`;

const expectedNew = `              <p className="mt-3 text-sm leading-relaxed text-[#60756e]" aria-live="polite">
                {predictionState.explanation}
              </p>
              
              {anomalyFlag && (
                <div className={anomalyFlag.className} aria-live="polite">
                  {anomalyFlag.text}
                </div>
              )}
            </section>`;

code = code.replace(expectedOld, expectedNew);

fs.writeFileSync('frontend/src/App.jsx', code);
console.log("Patch applied successfully.");
