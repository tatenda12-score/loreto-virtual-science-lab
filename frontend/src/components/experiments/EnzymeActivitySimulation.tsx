import React, { useState, useEffect, useRef } from 'react';
import { createSubmission, type Experiment } from '@/services/api';

interface SimulationProps {
  experiment: Experiment;
  onClose: () => void;
  onSuccess: (score: number | null) => void;
}

export default function EnzymeActivitySimulation({ experiment, onClose, onSuccess }: SimulationProps) {
  const [temperature, setTemperature] = useState<number>(20);
  const [isRunning, setIsRunning] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  
  // Starch breakdown model
  const calculateBreakdownTime = (temp: number) => {
    if (temp < 5) return Infinity; // Too cold
    if (temp <= 37) return Math.max(20, 200 * Math.pow(0.5, (temp - 10) / 10));
    return Math.min(600, 30 * Math.exp((temp - 37) / 4)); // Denaturation
  };

  const [breakdownTime, setBreakdownTime] = useState<number>(calculateBreakdownTime(20));

  // Timer effect
  useEffect(() => {
    let interval: any;
    if (isRunning) {
      interval = setInterval(() => {
        setTimeElapsed((prev) => prev + 1);
      }, 1000); // 1 real second = 1 sim second for realistic feel, but maybe speed it up? Let's use 1000ms = 10s for faster UX
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  // Adjust breakdown time when temp changes (before starting)
  useEffect(() => {
    if (!isRunning && timeElapsed === 0) {
      setBreakdownTime(calculateBreakdownTime(temperature));
    }
  }, [temperature, isRunning, timeElapsed]);

  const [spots, setSpots] = useState<Array<{ time: number, color: string }>>([]);

  const handleTakeSample = () => {
    if (!isRunning) return;
    const isStarchPresent = timeElapsed < breakdownTime;
    const color = isStarchPresent ? '#1e1b4b' : '#d97706'; // Blue-black vs Orange-brown
    setSpots((prev) => [...prev, { time: timeElapsed, color }]);
  };

  const resetExperiment = () => {
    setIsRunning(false);
    setTimeElapsed(0);
    setSpots([]);
  };

  // Submission state
  const [recordedData, setRecordedData] = useState<{ temp: number, time: number }[]>([]);
  const [inputTemp, setInputTemp] = useState('');
  const [inputTime, setInputTime] = useState('');
  
  const addReading = () => {
    if (!inputTemp || !inputTime) return;
    setRecordedData([...recordedData, { temp: Number(inputTemp), time: Number(inputTime) }]);
    setInputTemp('');
    setInputTime('');
  };

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (recordedData.length < 3) {
      setSubmitError('Please record at least 3 readings before submitting.');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      // Find optimum temp from student data
      let minTime = Infinity;
      let optTemp = 20;
      recordedData.forEach(d => {
        if (d.time < minTime) {
          minTime = d.time;
          optTemp = d.temp;
        }
      });
      const sub = await createSubmission(experiment.id, { optimum_temp: optTemp, raw_data: recordedData });
      onSuccess(sub.automatic_score ?? null);
    } catch (e: any) {
      setSubmitError(e.response?.data?.detail ?? 'Failed to submit report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'rgba(2,6,23,0.95)', backdropFilter: 'blur(16px)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm bg-green-500/20 text-green-400">🧬</div>
          <div>
            <h2 className="text-base font-bold text-white">{experiment.title}</h2>
            <p className="text-xs text-slate-400">{experiment.subject} · {experiment.difficulty}</p>
          </div>
        </div>
        <button onClick={onClose} className="px-3 py-1.5 border border-white/10 text-slate-300 rounded-lg hover:bg-white/5 transition-colors text-sm">
          ✕ Close
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Workspace */}
        <div className="space-y-6 flex flex-col">
          <div className="rounded-2xl border border-white/5 bg-slate-900 p-6 shadow-xl relative min-h-[400px]">
            <h3 className="text-sm font-bold text-slate-300 mb-4 uppercase tracking-wider">Water Bath & Test Tube</h3>
            
            <div className="flex items-end justify-center h-48 gap-8 border-b-2 border-slate-700 pb-4 relative">
              {/* Water Bath visually */}
              <div className="absolute bottom-4 w-64 h-24 bg-blue-500/20 rounded-lg border-2 border-blue-500/30 flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-blue-600/30 to-transparent"></div>
                <span className="text-blue-300 font-mono font-bold z-10">{temperature}°C Bath</span>
              </div>
              
              {/* Test Tube */}
              <div className="w-8 h-32 border-2 border-white/20 rounded-b-full bg-white/5 relative z-10 overflow-hidden flex flex-col justify-end">
                <div className="w-full bg-yellow-100/40 transition-all duration-300" style={{ height: isRunning ? '60%' : '30%' }}></div>
              </div>
            </div>

            <div className="mt-8 flex justify-center gap-4">
              <div className="flex flex-col items-center">
                <label className="text-xs text-slate-400 mb-2">Set Temp (°C)</label>
                <input 
                  type="range" min="10" max="70" step="5" 
                  value={temperature} onChange={(e) => setTemperature(Number(e.target.value))}
                  disabled={isRunning || timeElapsed > 0}
                  className="accent-green-500"
                />
                <span className="text-white font-mono mt-1">{temperature}°C</span>
              </div>
              
              <div className="flex flex-col items-center ml-8">
                <div className="text-2xl font-mono text-green-400 font-bold mb-2">{timeElapsed}s</div>
                <div className="flex gap-2">
                  {!isRunning ? (
                    <button onClick={() => setIsRunning(true)} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-500">
                      Start
                    </button>
                  ) : (
                    <button onClick={() => setIsRunning(false)} className="px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm font-bold hover:bg-yellow-500">
                      Pause
                    </button>
                  )}
                  <button onClick={resetExperiment} className="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm font-bold hover:bg-slate-600">
                    Reset
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* Spotting Tile */}
          <div className="rounded-2xl border border-white/5 bg-slate-900 p-6 shadow-xl">
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Iodine Spotting Tile</h3>
               <button 
                  onClick={handleTakeSample} disabled={!isRunning}
                  className="px-3 py-1.5 bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded-lg hover:bg-purple-600/30 text-sm font-medium transition-colors"
                >
                 🧪 Take Sample
               </button>
             </div>
             
             <div className="grid grid-cols-6 gap-2 bg-slate-100 rounded-xl p-4 min-h-[100px]">
               {spots.map((spot, i) => (
                 <div key={i} className="flex flex-col items-center">
                   <div className="w-10 h-10 rounded-full shadow-inner border border-black/10" style={{ backgroundColor: spot.color }}></div>
                   <span className="text-[10px] text-slate-500 font-mono mt-1">{spot.time}s</span>
                 </div>
               ))}
               {spots.length === 0 && (
                 <div className="col-span-6 text-center text-slate-400 text-sm italic py-4">No samples taken yet. Start the reaction and take samples periodically.</div>
               )}
             </div>
          </div>
        </div>

        {/* Data & Analysis */}
        <div className="flex flex-col space-y-6">
          <div className="rounded-2xl border border-white/5 bg-slate-900 p-6 shadow-xl flex-1">
            <h3 className="text-lg font-semibold text-white mb-4">Results Table</h3>
            
            <div className="flex gap-3 mb-6">
              <input 
                type="number" placeholder="Temp (°C)" value={inputTemp} onChange={e => setInputTemp(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
              />
              <input 
                type="number" placeholder="Time for starch to disappear (s)" value={inputTime} onChange={e => setInputTime(e.target.value)}
                className="flex-[2] bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
              />
              <button onClick={addReading} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-bold border border-white/10">Add</button>
            </div>

            <div className="border border-slate-800 rounded-xl overflow-hidden mb-6">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-800/50 text-slate-400 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3">Temperature (°C)</th>
                    <th className="px-4 py-3">Time (s)</th>
                    <th className="px-4 py-3">Rate (1/t)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {recordedData.map((d, i) => (
                    <tr key={i} className="hover:bg-slate-800/20">
                      <td className="px-4 py-3">{d.temp}</td>
                      <td className="px-4 py-3">{d.time}</td>
                      <td className="px-4 py-3">{(1/d.time).toFixed(4)}</td>
                    </tr>
                  ))}
                  {recordedData.length === 0 && (
                    <tr><td colSpan={3} className="px-4 py-6 text-center text-slate-500 italic">Record your findings here.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Simple Rate vs Temp Graph */}
            {recordedData.length > 0 && (
              <div className="mt-6 border-t border-slate-800 pt-6">
                <h4 className="text-sm font-medium text-slate-300 mb-4">Rate vs Temperature</h4>
                <div className="h-48 bg-slate-950 rounded-xl border border-slate-800 relative p-4">
                  {/* SVG Scatter Plot */}
                  <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                    {recordedData.map((d, i) => {
                      const x = (d.temp / 80) * 100;
                      const maxRate = Math.max(...recordedData.map(r => 1/r.time));
                      const y = 100 - ((1/d.time) / maxRate) * 100;
                      return (
                        <circle key={i} cx={`${x}%`} cy={`${y}%`} r="3" fill="#22c55e" />
                      );
                    })}
                  </svg>
                </div>
              </div>
            )}
          </div>
          
          {submitError && <div className="text-red-400 text-sm">{submitError}</div>}
          
          <button
            onClick={handleSubmit} disabled={submitting || recordedData.length === 0}
            className="w-full rounded-xl py-4 text-sm font-bold text-white transition-all bg-green-600 hover:bg-green-500 disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </div>
    </div>
  );
}
