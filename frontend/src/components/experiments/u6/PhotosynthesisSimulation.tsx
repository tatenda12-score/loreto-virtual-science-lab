import React, { useState } from 'react';
import { createSubmission, type Experiment } from '@/services/api';
import U6SimulationWrapper from './U6SimulationWrapper';

interface SimulationProps {
  experiment: Experiment;
  onClose: () => void;
  onSuccess: (score: number | null) => void;
}

export default function PhotosynthesisSimulation({ experiment, onClose, onSuccess }: SimulationProps) {
  // --- Planning State ---
  const [indepVar, setIndepVar] = useState<'light'|'co2'|'temp'>('light');
  
  // --- Practical State ---
  const [distance, setDistance] = useState(30); // cm
  const [co2, setCo2] = useState(0.5); // %
  const [temp, setTemp] = useState(25); // °C
  
  const [isRecording, setIsRecording] = useState(false);
  const [time, setTime] = useState(0);
  const [bubbles, setBubbles] = useState(0);
  
  // A simplified deterministic rate model for U6
  const getRate = (d: number, c: number, t: number) => {
    const lightInt = 1000 / (d * d); // inverse square
    // Limiting factor model: rate is min of the three factors
    const lightLim = lightInt * 2;
    const co2Lim = c * 20;
    
    // temp: bell curve peaking at 35
    let tempLim = 0;
    if (t > 0 && t <= 35) tempLim = t * 1.5;
    else if (t > 35 && t < 50) tempLim = 35 * 1.5 * (1 - (t-35)/15);
    
    let rate = Math.min(lightLim, co2Lim, tempLim);
    if (rate < 0) rate = 0;
    
    // Add realistic deterministic noise based on inputs
    const noise = (Math.sin(d * c * t) * 0.1) * rate; 
    return Math.max(0, rate + noise);
  };
  
  const currentRate = getRate(distance, co2, temp); // bubbles per second

  // React effect for timer would go here in a full app, but for U6 we can simulate fixed intervals
  const runTrial = () => {
    const trialTime = 60; // 60 seconds
    const generatedBubbles = Math.round(currentRate * trialTime);
    setBubbles(generatedBubbles);
    setTime(trialTime);
  };

  // --- Results State ---
  const [results, setResults] = useState<Array<{ id: number, val: number, time: number, bubbles: number }>>([]);
  
  const addResult = () => {
    const val = indepVar === 'light' ? distance : indepVar === 'co2' ? co2 : temp;
    setResults([...results, { id: Date.now(), val, time, bubbles }]);
  };

  // --- Analysis/Evaluation State ---
  const [answers, setAnswers] = useState({
    limitingFactor: '',
    anomaly: '',
    improvement: '',
    conclusion: ''
  });

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        independent_variable: indepVar,
        raw_data: results,
        analysis: answers
      };
      const sub = await createSubmission(experiment.id, payload);
      onSuccess(sub.automatic_score ?? null);
    } catch (e: any) {
      alert("Submission failed: " + (e.response?.data?.detail ?? 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  const renderStage = (stage: number, next: () => void, prev: () => void) => {
    switch(stage) {
      case 0: // Brief
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white">Experiment Brief</h3>
            <div className="prose prose-invert max-w-none text-slate-300">
              <p>Investigate factors affecting the rate of photosynthesis in an aquatic plant (e.g., Elodea).</p>
              <p><strong>Aim:</strong> To determine how light intensity, $CO_2$ concentration, or temperature affect the rate of oxygen production, and to identify limiting factors.</p>
              <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                <h4 className="text-purple-400 font-bold mb-2">Relevant Theory</h4>
                <p>Photosynthesis requires Light, $CO_2$, and a suitable temperature. The rate is limited by the factor in shortest supply (Blackman's Law of Limiting Factors). Light intensity follows the inverse square law: $I \propto 1/d^2$.</p>
              </div>
            </div>
          </div>
        );
      case 1: // Plan
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white">Experimental Planning</h3>
            <p className="text-slate-300">Select the independent variable you wish to investigate. The other variables must be strictly controlled.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              {[
                { id: 'light', title: 'Light Intensity', desc: 'Vary lamp distance' },
                { id: 'co2', title: 'CO₂ Concentration', desc: 'Vary NaHCO₃ %' },
                { id: 'temp', title: 'Temperature', desc: 'Vary water bath °C' }
              ].map(v => (
                <div 
                  key={v.id} 
                  onClick={() => setIndepVar(v.id as any)}
                  className={`p-4 rounded-xl cursor-pointer border-2 transition-all ${indepVar === v.id ? 'border-purple-500 bg-purple-500/10' : 'border-slate-700 bg-slate-800/50 hover:border-slate-500'}`}
                >
                  <h4 className="font-bold text-white mb-2">{v.title}</h4>
                  <p className="text-xs text-slate-400">{v.desc}</p>
                </div>
              ))}
            </div>
          </div>
        );
      case 2: // Practical
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 relative flex flex-col items-center justify-end min-h-[400px]">
              {/* Lamp */}
              <div className="absolute top-10 left-10 flex flex-col items-center transition-all duration-300" style={{ transform: `translateX(${(distance/100) * 200}px)` }}>
                <div className="w-16 h-16 bg-yellow-400/20 rounded-full flex items-center justify-center border border-yellow-400/50 shadow-[0_0_50px_rgba(250,204,21,0.3)]">💡</div>
                <div className="h-40 w-[2px] bg-yellow-400/20 mt-2"></div>
              </div>
              
              {/* Beaker */}
              <div className="w-48 h-64 border-4 border-slate-600 rounded-b-xl border-t-0 relative bg-blue-500/10 flex flex-col items-center justify-end p-2 overflow-hidden">
                 <div className="text-green-500/50 text-6xl">🌿</div>
                 {/* Bubbles animation would go here */}
                 {time > 0 && <div className="absolute inset-0 flex items-center justify-center text-white/50 animate-pulse">{bubbles} bubbles generated</div>}
              </div>
              
              <div className="w-full bg-slate-800 h-2 mt-4 rounded"></div>
            </div>
            
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 space-y-6">
              <h3 className="font-bold text-white uppercase tracking-wider text-sm mb-4">Apparatus Controls</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Lamp Distance (cm) {indepVar === 'light' ? '⭐ Independent' : '(Controlled)'}</span>
                    <span className="font-mono text-purple-400">{distance} cm</span>
                  </label>
                  <input type="range" min="10" max="100" step="5" value={distance} onChange={e=>setDistance(Number(e.target.value))} className="w-full" disabled={indepVar !== 'light'} />
                </div>
                <div>
                  <label className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>NaHCO₃ Concentration (%) {indepVar === 'co2' ? '⭐ Independent' : '(Controlled)'}</span>
                    <span className="font-mono text-purple-400">{co2.toFixed(1)} %</span>
                  </label>
                  <input type="range" min="0" max="2" step="0.1" value={co2} onChange={e=>setCo2(Number(e.target.value))} className="w-full" disabled={indepVar !== 'co2'} />
                </div>
                <div>
                  <label className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Temperature (°C) {indepVar === 'temp' ? '⭐ Independent' : '(Controlled)'}</span>
                    <span className="font-mono text-purple-400">{temp} °C</span>
                  </label>
                  <input type="range" min="5" max="50" step="5" value={temp} onChange={e=>setTemp(Number(e.target.value))} className="w-full" disabled={indepVar !== 'temp'} />
                </div>
              </div>
              
              <div className="pt-6 border-t border-slate-700 grid grid-cols-2 gap-4">
                <button onClick={runTrial} className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold border border-slate-600">
                  Run Trial (60s)
                </button>
                <button onClick={addResult} disabled={time === 0} className="px-4 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold disabled:opacity-50">
                  Record Result
                </button>
              </div>
            </div>
          </div>
        );
      case 3: // Results
      case 4: // Calculate
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white">{stage === 3 ? 'Data Collection' : 'Calculations'}</h3>
            <p className="text-slate-400 text-sm mb-4">Calculate the Rate (bubbles/min). Notice the variation; real experiments contain random errors.</p>
            <table className="w-full text-left text-sm text-slate-300 border border-slate-800 rounded-xl overflow-hidden">
              <thead className="bg-slate-800">
                <tr>
                  <th className="px-4 py-3">{indepVar === 'light' ? 'Distance (cm)' : indepVar === 'co2' ? 'CO2 (%)' : 'Temp (°C)'}</th>
                  <th className="px-4 py-3">Time (s)</th>
                  <th className="px-4 py-3">Bubbles</th>
                  <th className="px-4 py-3 text-purple-400">Rate (min⁻¹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {results.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/30">
                    <td className="px-4 py-2 font-mono">{r.val}</td>
                    <td className="px-4 py-2 font-mono">{r.time}</td>
                    <td className="px-4 py-2 font-mono">{r.bubbles}</td>
                    <td className="px-4 py-2 font-mono text-purple-400">{(r.bubbles / (r.time / 60)).toFixed(1)}</td>
                  </tr>
                ))}
                {results.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-slate-500">No data recorded. Return to the Practical stage.</td></tr>}
              </tbody>
            </table>
          </div>
        );
      case 5: // Graph
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white">Graph Construction</h3>
            <p className="text-slate-400 text-sm">Rate of Photosynthesis vs {indepVar === 'light' ? 'Light Intensity (1/d²)' : indepVar === 'co2' ? 'CO2 Concentration' : 'Temperature'}</p>
            <div className="h-64 bg-slate-900 border border-slate-700 rounded-xl relative p-8">
              {/* Dynamic SVG Plot */}
              <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="overflow-visible">
                <line x1="0" y1="100" x2="100" y2="100" stroke="#475569" strokeWidth="1" />
                <line x1="0" y1="0" x2="0" y2="100" stroke="#475569" strokeWidth="1" />
                {results.map((r) => {
                  let x = 0;
                  if (indepVar === 'light') x = ((1000/(r.val*r.val)) / 10) * 100; // max light intensity ~10
                  else if (indepVar === 'co2') x = (r.val / 2) * 100;
                  else x = (r.val / 50) * 100;
                  
                  const maxRate = 50; // max expected bubbles/min approx
                  const y = 100 - ((r.bubbles / (r.time / 60)) / maxRate) * 100;
                  return <circle key={r.id} cx={`${Math.min(100, Math.max(0, x))}%`} cy={`${Math.min(100, Math.max(0, y))}%`} r="2" fill="#a855f7" />;
                })}
              </svg>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-slate-500 uppercase">{indepVar}</div>
              <div className="absolute -left-4 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] text-slate-500 uppercase">Rate</div>
            </div>
          </div>
        );
      case 6: // Analyze
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white">Analysis</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-2">Identify the limiting factor when the graph plateaus, and explain why.</label>
                <textarea 
                  value={answers.limitingFactor} onChange={e=>setAnswers({...answers, limitingFactor: e.target.value})}
                  className="w-full h-24 bg-slate-900 border border-slate-700 rounded-lg p-3 text-white text-sm focus:border-purple-500" 
                  placeholder="e.g. As light intensity increases, rate increases until it plateaus. At this point, CO2 or temperature becomes the limiting factor..."
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-2">Identify any anomalous results and explain possible causes.</label>
                <textarea 
                  value={answers.anomaly} onChange={e=>setAnswers({...answers, anomaly: e.target.value})}
                  className="w-full h-24 bg-slate-900 border border-slate-700 rounded-lg p-3 text-white text-sm focus:border-purple-500" 
                />
              </div>
            </div>
          </div>
        );
      case 7: // Evaluate
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white">Evaluation</h3>
            <div>
              <label className="block text-sm text-slate-300 mb-2">Evaluate the reliability of the experiment and suggest improvements.</label>
              <textarea 
                value={answers.improvement} onChange={e=>setAnswers({...answers, improvement: e.target.value})}
                className="w-full h-32 bg-slate-900 border border-slate-700 rounded-lg p-3 text-white text-sm focus:border-purple-500" 
                placeholder="Consider sources of random and systematic errors (e.g. bubbles vary in volume, heat from the lamp affecting temperature)..."
              />
            </div>
          </div>
        );
      case 8: // Conclusion
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white">Conclusion</h3>
            <div>
              <label className="block text-sm text-slate-300 mb-2">Write a scientifically justified conclusion based ONLY on your collected data.</label>
              <textarea 
                value={answers.conclusion} onChange={e=>setAnswers({...answers, conclusion: e.target.value})}
                className="w-full h-40 bg-slate-900 border border-slate-700 rounded-lg p-3 text-white text-sm focus:border-purple-500" 
              />
            </div>
          </div>
        );
      case 9: // Submit
        return (
          <div className="space-y-6 flex flex-col items-center justify-center py-10">
            <h3 className="text-2xl font-bold text-white mb-2">Ready to Submit</h3>
            <p className="text-slate-400 text-center max-w-md mb-8">You have completed all stages of the Upper 6 Photosynthesis investigation. Your data, graph, analysis, and conclusion will be sent to the backend for automatic grading and teacher review.</p>
            
            <button
              onClick={handleSubmit} disabled={submitting || results.length === 0}
              className="px-8 py-4 rounded-xl text-lg font-bold text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Submitting...' : 'Submit Upper 6 Report'}
            </button>
          </div>
        );
      default: return null;
    }
  };

  return <U6SimulationWrapper experiment={experiment} onClose={onClose} renderStage={renderStage} />;
}
