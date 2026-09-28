import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Chart from 'chart.js/auto';
import { 
  Home, Sliders, Bell, User, Zap, Activity, AlertCircle, Sun, Cloud, Thermometer, 
  BatteryCharging, ArrowUpRight, Moon, ChevronDown, DollarSign, Leaf, Gauge, Battery, 
  Wind, Map, Droplets, PenTool, Cpu, Server, CheckCircle, BarChart3, Wrench, ShieldAlert
} from 'lucide-react';

const API_BASE = 'http://127.0.0.1:8000';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDark, setIsDark] = useState(true);
  const [selectedSite, setSelectedSite] = useState('Austin Residential Array');
  
  const [telemetry, setTelemetry] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const chartRef = useRef(null);
  const barChartRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const barChartInstanceRef = useRef(null);

  const [predForm, setPredForm] = useState({ hour: 14, temp: 33, irradiance: 910, cloud: 45, actual: "" });
  const [predResult, setPredResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Locked savings state (updates every 10 mins)
  const [displaySavings, setDisplaySavings] = useState(0);
  const latestSavingsRef = useRef(0);

  // Poll backend simulator every 3 seconds for live dashboard updates
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [telRes, anomRes] = await Promise.all([
          axios.get(`${API_BASE}/telemetry`),
          axios.get(`${API_BASE}/anomalies`)
        ]);
        
        if (telRes.data.telemetry) setTelemetry(telRes.data.telemetry);
        
        if (anomRes.data.anomalies) {
          const processedAnomalies = anomRes.data.anomalies.map(anom => ({
            time: new Date(anom.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            date: new Date(anom.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' }),
            expected: anom.expected_yield_kwh,
            actual: anom.energy_yield_kwh,
            drop: ((Math.abs(anom.efficiency_residual) / anom.expected_yield_kwh) * 100).toFixed(0),
            severity: ((Math.abs(anom.efficiency_residual) / anom.expected_yield_kwh) * 100 > 40) ? 'Critical' : 'Warning',
            panelId: anom.panel_id
          }));
          setAnomalies(processedAnomalies);
        }
      } catch (err) {
        console.warn("Backend not reachable", err);
      }
    };
    
    fetchData(); // Initial fetch
    const interval = setInterval(fetchData, 3000); // 3 second loop
    return () => clearInterval(interval);
  }, []);

  // --- Dynamic AI Calculations based on Live Simulator Data ---
  
  // Total generated over the 24 hour buffer
  const totalKwh = telemetry.reduce((sum, t) => sum + t.energy_yield_kwh, 0);
  const currentYield = telemetry.length > 0 ? telemetry[telemetry.length-1].energy_yield_kwh.toFixed(2) : "0.00";
  const expectedYield = telemetry.length > 0 ? telemetry[telemetry.length-1].expected_yield_kwh.toFixed(2) : "0.00";
  
  // Determine if it's day/night and set grid rates/battery dynamics
  const currentHour = telemetry.length > 0 ? telemetry[telemetry.length-1].hour_of_day : 12;
  const isPeakPricing = currentHour >= 16 && currentHour <= 20; // 4PM - 8PM Peak
  const gridPrice = isPeakPricing ? 22.50 : 12.50; // INR/kWh
  
  const batteryCharge = currentHour < 7 ? 40 : (currentHour < 16 ? Math.min(100, 40 + (currentHour - 7) * 8) : Math.max(20, 100 - (currentHour - 16) * 15));
  
  // Financials & Environment
  latestSavingsRef.current = totalKwh * gridPrice;
  
  useEffect(() => {
    if (displaySavings === 0 && latestSavingsRef.current > 0) {
      setDisplaySavings(latestSavingsRef.current);
    }
    const timer = setInterval(() => {
      setDisplaySavings(latestSavingsRef.current);
    }, 600000); // 10 minutes in milliseconds
    return () => clearInterval(timer);
  }, [displaySavings]);

  const savingsToday = displaySavings;
  const co2Offset = totalKwh * 0.42; // Approx 0.42 kg CO2 per kWh
  const treesEquivalent = Math.floor(co2Offset / 20);
  
  // Overall Health Score
  let totalExpected = telemetry.reduce((sum, t) => sum + t.expected_yield_kwh, 0);
  let efficiencyScore = totalExpected > 0 ? ((totalKwh / totalExpected) * 100) : 100;
  efficiencyScore = Math.min(100, efficiencyScore).toFixed(1);

  // Line Chart for Dashboard
  useEffect(() => {
    if (activeTab !== 'dashboard' || !chartRef.current || telemetry.length === 0) return;
    if (chartInstanceRef.current) chartInstanceRef.current.destroy();

    const ctx = chartRef.current.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 150);
    gradient.addColorStop(0, 'rgba(14, 165, 233, 0.4)'); 
    gradient.addColorStop(1, 'rgba(14, 165, 233, 0.0)');

    chartInstanceRef.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: telemetry.map(t => new Date(t.timestamp).getHours() + ":00"),
        datasets: [{
          label: "Actual Output",
          data: telemetry.map(t => t.energy_yield_kwh),
          borderColor: "#0EA5E9",
          backgroundColor: gradient,
          borderWidth: 3,
          pointRadius: 0,
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 500 }, // Smooth updates every 3 sec
        plugins: { legend: { display: false }, tooltip: { mode: 'index', backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)', titleColor: isDark ? '#fff' : '#000', bodyColor: isDark ? '#fff' : '#000', borderRadius: 12 } },
        scales: { x: { display: false }, y: { display: false, beginAtZero: true } }
      }
    });

    return () => { if (chartInstanceRef.current) chartInstanceRef.current.destroy(); };
  }, [activeTab, telemetry, isDark]);

  // Bar Chart for Analytics Tab
  useEffect(() => {
    if (activeTab !== 'analytics' || !barChartRef.current || telemetry.length === 0) return;
    if (barChartInstanceRef.current) barChartInstanceRef.current.destroy();

    const ctx = barChartRef.current.getContext('2d');
    barChartInstanceRef.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: telemetry.slice(-7).map(t => new Date(t.timestamp).getHours() + ":00"),
        datasets: [
          { label: "Expected", data: telemetry.slice(-7).map(t => t.expected_yield_kwh), backgroundColor: "rgba(16, 185, 129, 0.8)", borderRadius: 4 },
          { label: "Actual", data: telemetry.slice(-7).map(t => t.energy_yield_kwh), backgroundColor: "rgba(14, 165, 233, 0.8)", borderRadius: 4 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 500 },
        plugins: { legend: { labels: { color: isDark ? '#fff' : '#000' } } },
        scales: {
          x: { ticks: { color: isDark ? '#aaa' : '#555' }, grid: { display: false } },
          y: { ticks: { color: isDark ? '#aaa' : '#555' }, grid: { color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' } }
        }
      }
    });

    return () => { if (barChartInstanceRef.current) barChartInstanceRef.current.destroy(); };
  }, [activeTab, telemetry, isDark]);

  const handlePredict = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/predict`, {
        hour_of_day: predForm.hour, ambient_temp_c: predForm.temp, module_temp_c: predForm.temp + 2,
        solar_irradiance_w_m2: predForm.irradiance, cloud_cover_pct: predForm.cloud
      });
      const expected = res.data.expected_yield_kwh;
      let anomalyData = null;
      if (predForm.actual !== "") {
        const actual = parseFloat(predForm.actual);
        const drop = ((expected - actual) / expected) * 100;
        anomalyData = { isAnomaly: expected > 1.0 && drop > 25, drop: drop.toFixed(0) };
      }
      setTimeout(() => { setPredResult({ expected, anomalyData }); setIsLoading(false); }, 600);
    } catch (err) { console.error(err); setIsLoading(false); }
  };

  const renderDashboard = () => (
    <div className="pb-32 px-4 pt-10 space-y-4 animate-bento">
      
      {/* Dynamic Predictive Weather Alert */}
      {currentHour >= 12 && currentHour <= 15 && (
        <div className="liquid-glass bg-gradient-to-r from-amber-500/20 to-rose-500/20 backdrop-blur-[40px] rounded-[24px] p-4 border border-amber-500/30 shadow-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Cloud className="w-8 h-8 text-amber-500 dark:text-amber-400" />
            <div>
              <p className="text-slate-900 dark:text-white font-bold text-sm">Predictive Weather Alert</p>
              <p className="text-slate-700 dark:text-white/80 text-xs">Heavy cloud cover detected. Yield dropping.</p>
            </div>
          </div>
        </div>
      )}

      {/* Hero Financial & Yield */}
      <div className="liquid-glass bg-white/60 dark:bg-black/40 backdrop-blur-[40px] rounded-[36px] border border-white/80 dark:border-white/20 border-t-white dark:border-t-white/40 shadow-xl dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src="https://images.unsplash.com/photo-1509391366360-1e9e04bc20d7?q=100&w=2400&auto=format&fit=crop" className="w-full h-full object-cover opacity-20 dark:opacity-50 mix-blend-overlay" />
          <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-white/50 dark:from-black/80 dark:via-black/20 to-transparent"></div>
        </div>
        <div className="relative z-10 p-7">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-600 dark:text-white/80 font-bold text-sm mb-1 flex items-center gap-2"><Zap className="w-4 h-4 text-cyan-500 dark:text-cyan-400" /> Live Power Output</p>
              <div className="flex items-baseline gap-2">
                <span className="text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-slate-900 to-slate-500 dark:from-white dark:to-white/60 drop-shadow-sm transition-all duration-300">{currentYield}</span>
                <span className="text-xl text-slate-500 dark:text-white/60 font-bold">kWh</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-slate-600 dark:text-white/80 font-bold text-xs uppercase tracking-wider mb-1">Today's Savings</p>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 transition-all duration-300">₹{savingsToday.toFixed(2)}</p>
            </div>
          </div>
          <div className="h-28 w-full mt-4 -mb-4 relative z-10">
            {telemetry.length > 0 ? <canvas ref={chartRef}></canvas> : <div className="h-full flex items-center justify-center text-slate-400 dark:text-white/40 text-sm font-semibold">Generating simulation data...</div>}
          </div>
        </div>
      </div>

      {/* Grid Trading & Battery (Virtual Power Plant) */}
      <div className="liquid-glass bg-white/60 dark:bg-white/10 backdrop-blur-[30px] rounded-[32px] p-6 border border-white/80 dark:border-white/20 shadow-xl relative overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2"><Battery className="w-5 h-5 text-cyan-500"/> <h2 className="font-black text-slate-900 dark:text-white">Smart Grid & Storage</h2></div>
          {isPeakPricing ? (
            <div className="bg-rose-100 dark:bg-rose-500/20 border border-rose-300 dark:border-rose-400/40 px-3 py-1 rounded-full text-xs font-bold text-rose-700 dark:text-rose-300 shadow-sm animate-pulse">
              Peak Arbitrage Active
            </div>
          ) : (
            <div className="bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-400/40 px-3 py-1 rounded-full text-xs font-bold text-emerald-700 dark:text-emerald-300 shadow-sm">
              Storing Energy
            </div>
          )}
        </div>
        <div className="flex gap-4 items-center">
          <div className="w-16 h-16 rounded-full border-4 border-cyan-400 flex items-center justify-center font-black text-xl text-slate-900 dark:text-white shadow-[0_0_15px_rgba(34,211,238,0.4)]">
            {batteryCharge}%
          </div>
          <div>
            <p className="text-slate-900 dark:text-white font-bold text-sm">
              {isPeakPricing ? 'Discharging to Grid' : 'Charging Battery Array'}
            </p>
            <p className="text-slate-600 dark:text-white/60 text-xs mt-1">
              Current Rate: <strong className={isPeakPricing ? "text-rose-500 dark:text-rose-400" : "text-emerald-500 dark:text-emerald-400"}>₹{gridPrice.toFixed(2)}/kWh</strong>. {isPeakPricing ? "AI is selling for maximum profit." : "Buying cheap / storing solar."}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Environment / Carbon Offset */}
        <div className="liquid-glass bg-white/60 dark:bg-white/10 backdrop-blur-[30px] rounded-[32px] p-6 border border-white/80 dark:border-white/20 shadow-xl flex flex-col justify-between">
          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-400/40 flex items-center justify-center mb-4">
            <Leaf className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-slate-500 dark:text-white/60 text-xs font-bold uppercase tracking-widest mb-1">Carbon Offset</p>
            <p className="text-3xl font-black text-slate-900 dark:text-white transition-all duration-300">{co2Offset.toFixed(1)} <span className="text-sm font-bold text-slate-400 dark:text-white/50">kg</span></p>
            <p className="text-xs text-slate-600 dark:text-white/60 mt-1 flex items-center gap-1"><CheckCircle className="w-3 h-3 text-emerald-500"/> = {treesEquivalent} Trees</p>
          </div>
        </div>

        {/* System Efficiency Gauge */}
        <div className="liquid-glass bg-white/60 dark:bg-white/10 backdrop-blur-[30px] rounded-[32px] p-6 border border-white/80 dark:border-white/20 shadow-xl flex flex-col justify-between">
          <div className="w-10 h-10 rounded-full bg-cyan-100 dark:bg-cyan-500/20 border border-cyan-300 dark:border-cyan-400/40 flex items-center justify-center mb-4">
            <Gauge className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div>
            <p className="text-slate-500 dark:text-white/60 text-xs font-bold uppercase tracking-widest mb-1">Health Score</p>
            <p className="text-3xl font-black text-slate-900 dark:text-white transition-all duration-300">{efficiencyScore}<span className="text-sm font-bold text-slate-400 dark:text-white/50">%</span></p>
            <p className="text-xs text-slate-600 dark:text-white/60 mt-1">Based on ML baseline</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="pb-32 px-4 pt-10 space-y-4 animate-bento">
      <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-6">Advanced Analytics</h1>
      
      {/* Dual Bar Chart */}
      <div className="liquid-glass bg-white/60 dark:bg-white/10 backdrop-blur-[30px] rounded-[32px] p-6 border border-white/80 dark:border-white/20 shadow-xl">
        <h2 className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2"><BarChart3 className="w-5 h-5"/> Expected vs Actual (7 Hrs)</h2>
        <p className="text-xs text-slate-500 dark:text-white/60 mb-6">Live AI simulated ideal yield versus generated output.</p>
        <div className="h-48 w-full"><canvas ref={barChartRef}></canvas></div>
      </div>

      {/* Soiling & Cleaning AI */}
      <div className="liquid-glass bg-white/60 dark:bg-white/10 backdrop-blur-[30px] rounded-[32px] p-6 border border-white/80 dark:border-white/20 shadow-xl relative overflow-hidden">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-400/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Droplets className="w-5 h-5" />
            </div>
            <div>
               <h2 className="font-bold text-slate-900 dark:text-white">Soiling Optimizer</h2>
               <p className="text-xs text-slate-500 dark:text-white/60">Dust & debris loss analysis</p>
            </div>
          </div>
          <span className="text-xl font-black text-rose-500 dark:text-rose-400">-{Math.max(0, 100 - parseFloat(efficiencyScore)).toFixed(1)}%</span>
        </div>
        <p className="text-sm text-slate-700 dark:text-white/80 leading-relaxed mb-4">
          The ML model detected an efficiency bleed. Washing the arrays will yield a positive financial return based on current grid rates.
        </p>
        <div className="bg-white/80 dark:bg-black/30 rounded-xl p-3 flex justify-between items-center border border-white dark:border-white/10">
          <div>
            <p className="text-[10px] text-slate-500 dark:text-white/50 uppercase font-bold">Est. Wash ROI</p>
            <p className="font-black text-emerald-600 dark:text-emerald-400">+₹3200.00/mo</p>
          </div>
          <button className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 rounded-lg text-xs font-bold shadow-md hover:scale-105 transition-transform">
            Schedule Wash
          </button>
        </div>
      </div>

      {/* RUL Forecasting */}
      <div className="liquid-glass bg-white/60 dark:bg-white/10 backdrop-blur-[30px] rounded-[32px] p-6 border border-white/80 dark:border-white/20 shadow-xl">
        <h2 className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2"><Cpu className="w-5 h-5"/> Remaining Useful Life (RUL)</h2>
        <p className="text-xs text-slate-500 dark:text-white/60 mb-4">Predictive hardware failure forecasting.</p>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center bg-white/50 dark:bg-black/20 p-3 rounded-xl border border-white dark:border-white/5">
            <span className="text-sm font-bold text-slate-700 dark:text-white/80">Inverter Alpha-1</span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/20 px-2 py-1 rounded-md">Expected: 8.5 Yrs</span>
          </div>
          <div className="flex justify-between items-center bg-rose-50 dark:bg-rose-500/10 p-3 rounded-xl border border-rose-200 dark:border-rose-500/30">
            <span className="text-sm font-bold text-slate-700 dark:text-white/80">Panel String B</span>
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-500/20 px-2 py-1 rounded-md">Risk: 3 Months</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDiagnostics = () => (
    <div className="pb-32 px-4 pt-10 space-y-4 animate-bento">
      <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-6">Digital Twin & Diagnostics</h1>

      {/* Visual Solar Array Matrix */}
      <div className="liquid-glass bg-white/60 dark:bg-white/10 backdrop-blur-[30px] rounded-[32px] p-6 border border-white/80 dark:border-white/20 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><Map className="w-5 h-5"/> Solar Array Matrix</h2>
            <p className="text-xs text-slate-500 dark:text-white/60">Live panel-level diagnostics.</p>
          </div>
          <div className="flex gap-2">
             <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
             <span className="w-3 h-3 rounded-full bg-rose-500 animate-pulse"></span>
          </div>
        </div>
        
        <div className="grid grid-cols-4 gap-2">
          {[...Array(12)].map((_, i) => {
            const isAnomaly = anomalies.some(a => a.panelId === `P-${i+1}`);
            return (
              <div key={i} className={`h-16 rounded-lg border-2 flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                isAnomaly 
                  ? 'bg-rose-500/20 border-rose-500 text-rose-600 dark:text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.4)] animate-pulse' 
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
              }`}>
                P-{i+1}
              </div>
            );
          })}
        </div>
      </div>

      {/* Automated Work Order Ticket */}
      {anomalies.length > 0 && (
        <div className="liquid-glass bg-rose-50/80 dark:bg-rose-900/20 backdrop-blur-[30px] rounded-[32px] p-6 border border-rose-200 dark:border-rose-500/30 shadow-xl relative overflow-hidden">
          <div className="flex items-center gap-3 mb-4">
            <Wrench className="w-6 h-6 text-rose-600 dark:text-rose-400" />
            <h2 className="font-black text-rose-700 dark:text-rose-300">Automated Work Order</h2>
          </div>
          <p className="text-sm text-slate-800 dark:text-rose-100/80 mb-4 font-medium">
            The AI has drafted a dispatch ticket for the detected DBSCAN anomaly on {anomalies[0].panelId}.
          </p>
          <div className="bg-white/80 dark:bg-black/40 rounded-xl p-4 text-xs font-mono text-slate-600 dark:text-white/70 space-y-2 border border-rose-100 dark:border-rose-500/20">
            <p><span className="text-rose-500 font-bold">TASK:</span> Inspect/Replace Panel {anomalies[0].panelId}</p>
            <p><span className="text-rose-500 font-bold">DIAGNOSIS:</span> Efficiency drop {anomalies[0].drop}%</p>
            <p><span className="text-rose-500 font-bold">EST LABOR:</span> ₹2,500.00 (1.5 hrs)</p>
          </div>
          <button className="w-full mt-4 bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-[16px] font-bold shadow-lg transition-transform active:scale-95">
            Dispatch Technician
          </button>
        </div>
      )}

      {/* Thermal Drone Scan Placeholder */}
      <div className="liquid-glass bg-white/60 dark:bg-white/10 backdrop-blur-[30px] rounded-[32px] p-6 border border-white/80 dark:border-white/20 shadow-xl">
        <h2 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2"><ShieldAlert className="w-5 h-5"/> Drone Thermal Scans</h2>
        <div className="w-full h-40 rounded-2xl overflow-hidden relative border border-white/50 dark:border-white/10">
          <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800&auto=format&fit=crop" className="w-full h-full object-cover opacity-80" alt="Thermal Data" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 to-transparent flex items-end p-4">
            <span className="bg-rose-500/80 text-white text-[10px] font-black uppercase px-2 py-1 rounded shadow-md border border-rose-400">Hot Spot Detected</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPredictor = () => (
    <div className="pb-32 px-4 pt-10 animate-bento">
      <div className="w-full h-56 rounded-[36px] overflow-hidden relative mb-6 border border-white/80 dark:border-white/20 border-t-white dark:border-t-white/40 shadow-xl dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] bg-white/40 dark:bg-black/30 backdrop-blur-[20px]">
        <img src="https://images.unsplash.com/photo-1592833159155-c62df1b65634?q=100&w=2400&auto=format&fit=crop" alt="Solar Panels Sun" className="w-full h-full object-cover opacity-30 dark:opacity-60 mix-blend-overlay" />
        <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-white/40 dark:from-black/90 dark:via-black/30 to-transparent"></div>
        <div className="absolute bottom-6 left-6">
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight drop-shadow-sm dark:drop-shadow-xl">AI Sandbox</h1>
          <p className="text-slate-600 dark:text-white/70 font-bold text-sm mt-1">Manual environmental simulation.</p>
        </div>
      </div>

      <div className="bg-white/60 dark:bg-white/10 backdrop-blur-[30px] rounded-[36px] p-7 border border-white/80 dark:border-white/20 border-t-white dark:border-t-white/40 shadow-xl dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
        <form onSubmit={handlePredict} className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-bold text-slate-700 dark:text-white/80 flex items-center gap-2"><Sun className="w-4 h-4 text-amber-500 dark:text-amber-400"/> Hour</label>
              <span className="text-lg font-black text-slate-900 dark:text-white bg-white/80 dark:bg-white/10 px-3 py-1 rounded-[14px] backdrop-blur-xl border border-white dark:border-white/10">{String(predForm.hour).padStart(2, '0')}:00</span>
            </div>
            <input type="range" min="0" max="23" value={predForm.hour} onChange={e => setPredForm({...predForm, hour: Number(e.target.value)})} className="w-full h-2 bg-slate-200 dark:bg-white/20 rounded-lg appearance-none outline-none" />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-bold text-slate-700 dark:text-white/80 flex items-center gap-2"><Sun className="w-4 h-4 text-amber-500"/> Irradiance</label>
              <span className="text-lg font-black text-slate-900 dark:text-white bg-white/80 dark:bg-white/10 px-3 py-1 rounded-[14px] backdrop-blur-xl border border-white dark:border-white/10">{predForm.irradiance} <span className="text-xs text-slate-500 dark:text-white/50">W/m²</span></span>
            </div>
            <input type="range" min="0" max="1200" step="10" value={predForm.irradiance} onChange={e => setPredForm({...predForm, irradiance: Number(e.target.value)})} className="w-full h-2 bg-slate-200 dark:bg-white/20 rounded-lg appearance-none outline-none" />
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="bg-white/50 dark:bg-black/30 backdrop-blur-xl rounded-[24px] p-5 border border-white/80 dark:border-white/10 shadow-sm dark:shadow-inner">
              <label className="text-xs font-bold text-slate-500 dark:text-white/60 uppercase tracking-wider mb-2 block"><Thermometer className="w-3.5 h-3.5 inline"/> Temp</label>
              <input type="number" value={predForm.temp} onChange={e => setPredForm({...predForm, temp: Number(e.target.value)})} className="w-full bg-transparent text-3xl font-black text-slate-900 dark:text-white focus:outline-none" />
            </div>
            <div className="bg-white/50 dark:bg-black/30 backdrop-blur-xl rounded-[24px] p-5 border border-white/80 dark:border-white/10 shadow-sm dark:shadow-inner">
              <label className="text-xs font-bold text-slate-500 dark:text-white/60 uppercase tracking-wider mb-2 block"><Cloud className="w-3.5 h-3.5 inline"/> Cloud</label>
              <input type="number" value={predForm.cloud} onChange={e => setPredForm({...predForm, cloud: Number(e.target.value)})} className="w-full bg-transparent text-3xl font-black text-slate-900 dark:text-white focus:outline-none" />
            </div>
          </div>

          <button type="submit" className="w-full relative overflow-hidden rounded-[24px] shadow-lg dark:shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-transform active:scale-95 border border-slate-200 dark:border-white/40">
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white/90 dark:to-white/70 backdrop-blur-xl"></div>
            <div className="relative z-10 py-5 font-black text-lg text-white dark:text-black flex items-center justify-center gap-2">
              {isLoading ? <span className="animate-pulse">Analyzing...</span> : <><Zap className="w-5 h-5"/> Generate Output</>}
            </div>
          </button>
        </form>
      </div>

      {predResult && !isLoading && (
        <div className="mt-6 animate-bento bg-white/60 dark:bg-black/40 backdrop-blur-[40px] rounded-[36px] p-7 border border-cyan-200 dark:border-cyan-400/40 border-t-white dark:border-t-cyan-300/60 shadow-xl dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          <p className="text-slate-500 dark:text-white/60 text-xs font-bold uppercase tracking-widest mb-2">Expected Generation</p>
          <div className="flex items-baseline gap-2 mb-5">
            <span className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-slate-900 to-slate-500 dark:from-white dark:to-white/60">{predResult.expected.toFixed(2)}</span>
            <span className="text-slate-500 dark:text-white/60 font-bold text-lg">kWh</span>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className={isDark ? "dark" : ""}>
      <div className="max-w-2xl mx-auto min-h-screen relative overflow-hidden bg-slate-50 dark:bg-[#030712] font-sans selection:bg-cyan-500/30 transition-colors duration-500">
        
        {/* Global Background Image */}
        <div className="fixed inset-0 z-0 transition-opacity duration-500">
          <img src="https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?q=100&w=3840&auto=format&fit=crop" className="w-full h-full object-cover opacity-10 dark:opacity-25 mix-blend-multiply dark:mix-blend-overlay" />
          <div className="absolute inset-0 bg-slate-50/80 dark:bg-[#030712]/70 backdrop-blur-[2px]"></div>
        </div>

        {/* Ambient Lighting Orbs */}
        <div className={`fixed top-[-15%] left-[-15%] w-[500px] h-[500px] bg-cyan-400/30 dark:bg-cyan-600/40 rounded-full blur-[140px] pointer-events-none z-0 transition-colors duration-500`}></div>
        <div className={`fixed bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-emerald-400/20 dark:bg-emerald-600/30 rounded-full blur-[160px] pointer-events-none z-0 transition-colors duration-500`}></div>
        <div className={`fixed top-[40%] left-[60%] w-[400px] h-[400px] bg-amber-300/20 dark:bg-amber-500/20 rounded-full blur-[120px] pointer-events-none z-0 transition-colors duration-500`}></div>
        
        {/* Multi-Site Enterprise Header */}
        <div className="relative z-20 pt-6 px-4 flex justify-between items-center">
          <div className="flex items-center gap-2 bg-white/70 dark:bg-white/10 backdrop-blur-xl border border-white dark:border-white/20 rounded-full px-4 py-2 shadow-md cursor-pointer hover:bg-white/90 dark:hover:bg-white/20 transition-colors">
            <Server className="w-4 h-4 text-cyan-600 dark:text-cyan-400"/>
            <span className="text-xs font-bold text-slate-800 dark:text-white">{selectedSite}</span>
            <ChevronDown className="w-4 h-4 text-slate-500 dark:text-white/60"/>
          </div>
          <button onClick={() => setIsDark(!isDark)} className="w-10 h-10 rounded-full bg-white/70 dark:bg-white/10 backdrop-blur-xl border border-white dark:border-white/20 flex items-center justify-center text-amber-500 dark:text-white hover:scale-110 transition-transform shadow-md">
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>

        <div className="relative z-10 h-[calc(100vh-80px)] overflow-y-auto hide-scrollbar">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'analytics' && renderAnalytics()}
          {activeTab === 'diagnostics' && renderDiagnostics()}
          {activeTab === 'predictor' && renderPredictor()}
        </div>

        {/* 4-Tab Navigation */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/70 dark:bg-white/10 backdrop-blur-[40px] border border-white dark:border-white/20 border-t-white dark:border-t-white/40 rounded-[28px] px-5 py-3.5 flex gap-8 shadow-xl dark:shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-50">
          <NavBtn id="dashboard" icon={<Home />} label="Dash" current={activeTab} set={setActiveTab} />
          <NavBtn id="analytics" icon={<BarChart3 />} label="Stats" current={activeTab} set={setActiveTab} />
          <NavBtn id="diagnostics" icon={<ShieldAlert />} label="Twin" current={activeTab} set={setActiveTab} />
          <NavBtn id="predictor" icon={<Sliders />} label="Sim" current={activeTab} set={setActiveTab} />
        </div>

      </div>
    </div>
  );
}

function NavBtn({ id, icon, label, current, set }) {
  const active = current === id;
  return (
    <button onClick={() => set(id)} className={`flex flex-col items-center transition-all duration-300 w-12 ${active ? 'text-cyan-600 dark:text-white scale-110 drop-shadow-sm dark:drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]' : 'text-slate-400 dark:text-white/40 hover:text-slate-600 dark:hover:text-white/70'}`}>
      {React.cloneElement(icon, { className: 'w-6 h-6 mb-0.5' })}
      <span className="text-[9px] font-black uppercase tracking-wider">{label}</span>
    </button>
  );
}
