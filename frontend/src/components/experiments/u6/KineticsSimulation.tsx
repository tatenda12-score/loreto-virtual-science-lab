import React, { useState } from 'react';
import { createSubmission, type Experiment } from '@/services/api';
import U6SimulationWrapper from './U6SimulationWrapper';

interface SimulationProps {
  experiment: Experiment;
  onClose: () => void;
  onSuccess: (score: number | null) => void;
}

export default function KineticsSimulation({ experiment, onClose, onSuccess }: SimulationProps) {
  // --- Practical State ---
  const [tempC, setTempC] = useState(25); // °C
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isDone, setIsDone] = useState(false);

  // Kinetics Model (Sodium Thiosulphate + HCl)
  // k = A * e^(-Ea / RT)
  // time proportional to 1/k
  const Ea = 50000; // J/mol (50 kJ/mol)
  const R = 8.314;
  const A = 1e10; // pre-exponential factor
  
  const calculateTrueTime = (tC: number) => {
    const T = tC + 273.15;
    const k = A * Math.exp(-Ea / (R * T));
    return 10 / k; // scale factor so time is ~30-60s at room temp
  };

  const runTrial = () => {
    setIsRunning(true);
    setIsDone(false);
    setTime(0);
    const expectedTime = calculateTrueTime(tempC);
    const noise = expectedTime * (Math.random() * 0.04 - 0.02); // ±2% random error
    const finalTime = Math.max(1, Math.round(expectedTime + noise));
    
    // In a real simulation this would tick up, here we simulate the jump for U6 workflow speed
    setTimeout(() => {
      setTime(finalTime);
      setIsRunning(false);
      setIsDone(true);
    }, 1000); // 1s visual delay
  };

  // --- Results State ---
  const [results, setResults] = useState<Array<{ id: number, tempC: number, time: number }>>([]);
  
  const addResult = () => {
    if (isDone) {
      setResults([...results, { id: Date.now(), tempC, time }]);
      setIsDone(false);
      setTime(0);
    }
  };

  // --- Calculations State ---
  const [calcs, setCalcs] = useState<Record<number, { tempK: string, invT: string, lnRate: string }>>({});
  
  const updateCalc = (id: number, field: string, val: string) => {
    setCalcs(prev => ({
      ...prev,
      [id]: { ...(prev[id] || { tempK: '', invT: '', lnRate: '' }), [field]: val }
    }));
  };

  // --- Analysis State ---
  const [answers, setAnswers] = useState({
    gradient: '',
    activationEnergy: '',
    anomaly: '',
    conclusion: ''
  });

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        raw_data: results,
        calculations: calcs,
        analysis: answers,
        activation_energy_kj_mol: Number(answers.activationEnergy)
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
      case 0:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white">Experiment Brief</h3>
            <div className="prose prose-invert max-w-none text-slate-300">
              <p>Determine the activation energy ($E_a$) of the reaction between sodium thiosulphate and hydrochloric acid by investigating how reaction rate changes with temperature.</p>
              <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                <h4 className="text-pink-400 font-bold mb-2">Arrhenius Equation</h4>
                <p>{"$k = A e^{-E_a/RT}$"}</p>
                <p>{"Linear form: $\\ln(k) = \\ln(A) - \\frac{E_a}{R} \\cdot \\frac{1}{T}$"}</p>
                <p>By plotting $\ln(rate)$ against $1/T$, the gradient is $-E_a / R$.</p>
              </div>
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white">Experimental Planning</h3>
            <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl space-y-4 text-slate-300 text-sm">
              <p><strong>Independent Variable:</strong> Temperature ($T$)</p>
              <p><strong>Dependent Variable:</strong> Reaction Time ($t$), which gives $Rate \propto 1/t$</p>
              <p><strong>Controlled Variables:</strong> Volumes and concentrations of both reactants, dimensions of the flask, size and darkness of the cross.</p>
              <p className="text-yellow-400 text-xs italic mt-4">Note: Changing multiple variables simultaneously invalidates the Arrhenius analysis.</p>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 relative flex flex-col items-center min-h-[400px]">
              <div className="absolute inset-x-0 bottom-0 h-40 bg-blue-500/10 border-t border-blue-500/30 flex justify-center items-end pb-4">
                 <span className="text-blue-300 font-mono text-sm">Water Bath: {tempC}°C</span>
              </div>
              
              <div className="z-10 mt-20 relative">
                {/* Conical Flask top-down view for disappearing cross */}
                <div className="w-40 h-40 rounded-full border-4 border-white/20 bg-slate-800 relative flex items-center justify-center overflow-hidden">
                  <div className="text-black text-6xl font-black absolute z-0" style={{ opacity: isDone ? 0 : 0.8 }}>X</div>
                  <div className={`absolute inset-0 bg-[#e2e8f0] transition-opacity duration-[${time}s] ${isDone ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDuration: isRunning ? '1s' : '0s' }}></div>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 space-y-6">
              <h3 className="font-bold text-white uppercase text-sm mb-4">Temperature Control</h3>
              <input type="range" min="10" max="70" step="5" value={tempC} onChange={e=>setTempC(Number(e.target.value))} className="w-full accent-pink-500" disabled={isRunning} />
              
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-6 text-center">
                 <div className="text-5xl font-mono text-pink-400 mb-2">{time > 0 ? time : '00'}s</div>
                 <div className="text-xs text-slate-500 uppercase tracking-widest">Stopwatch</div>
              </div>
              
              <div className="flex gap-4">
                <button onClick={runTrial} disabled={isRunning} className="flex-1 py-3 bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-700 disabled:opacity-50">Start Reaction</button>
                <button onClick={addResult} disabled={!isDone} className="flex-1 py-3 bg-pink-600 text-white rounded-lg font-bold hover:bg-pink-500 disabled:opacity-50">Record</button>
              </div>
            </div>
          </div>
        );
      case 3:
      case 4:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white">{stage === 3 ? 'Raw Data' : 'Calculations Workspace'}</h3>
            <p className="text-slate-400 text-sm">Convert Temp to Kelvin, calculate $1/T$, and calculate $\ln(1/t)$.</p>
            <table className="w-full text-left text-sm text-slate-300 border border-slate-800 rounded-xl overflow-hidden">
              <thead className="bg-slate-800">
                <tr>
                  <th className="px-3 py-3">Temp (°C)</th>
                  <th className="px-3 py-3">Time (s)</th>
                  {stage === 4 && (
                    <>
                      <th className="px-3 py-3 text-pink-400">T (K)</th>
                      <th className="px-3 py-3 text-pink-400">1/T (K⁻¹)</th>
                      <th className="px-3 py-3 text-pink-400">ln(rate)</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {results.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/30">
                    <td className="px-3 py-2">{r.tempC}</td>
                    <td className="px-3 py-2">{r.time}</td>
                    {stage === 4 && (
                      <>
                        <td className="px-1 py-1"><input value={calcs[r.id]?.tempK || ''} onChange={e=>updateCalc(r.id, 'tempK', e.target.value)} className="w-20 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs" placeholder={r.tempC+273.15+""} /></td>
                        <td className="px-1 py-1"><input value={calcs[r.id]?.invT || ''} onChange={e=>updateCalc(r.id, 'invT', e.target.value)} className="w-24 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs" placeholder={(1/(r.tempC+273.15)).toPrecision(4)} /></td>
                        <td className="px-1 py-1"><input value={calcs[r.id]?.lnRate || ''} onChange={e=>updateCalc(r.id, 'lnRate', e.target.value)} className="w-24 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs" placeholder={Math.log(1/r.time).toFixed(3)} /></td>
                      </>
                    )}
                  </tr>
                ))}
                {results.length === 0 && <tr><td colSpan={5} className="text-center py-8">No data.</td></tr>}
              </tbody>
            </table>
          </div>
        );
      case 5:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white">Arrhenius Graph</h3>
            <p className="text-slate-400 text-sm">$\ln(rate)$ vs $1/T$</p>
            <div className="h-72 bg-slate-900 border border-slate-700 rounded-xl relative p-8">
              <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                <line x1="0" y1="100" x2="100" y2="100" stroke="#475569" />
                <line x1="0" y1="0" x2="0" y2="100" stroke="#475569" />
                {results.map((r) => {
                  const invT = 1 / (r.tempC + 273.15);
                  const lnK = Math.log(1/r.time);
                  // Approximate ranges for scaling: invT ~ 0.0028 to 0.0035, lnK ~ -5 to 0
                  const x = ((invT - 0.0028) / 0.0008) * 100;
                  const y = 100 - ((lnK + 6) / 6) * 100;
                  return <circle key={r.id} cx={`${x}%`} cy={`${y}%`} r="2" fill="#ec4899" />;
                })}
              </svg>
            </div>
          </div>
        );
      case 6:
      case 7:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white">{stage === 6 ? 'Gradient & Activation Energy' : 'Evaluation'}</h3>
            {stage === 6 ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Determine the gradient of the line of best fit.</label>
                  <input type="text" value={answers.gradient} onChange={e=>setAnswers({...answers, gradient: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white text-sm" placeholder="e.g. -6014" />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Calculate Activation Energy ($E_a$) in kJ/mol.</label>
                  <input type="text" value={answers.activationEnergy} onChange={e=>setAnswers({...answers, activationEnergy: e.target.value})} className="w-full bg-slate-900 border border-pink-500/50 rounded-lg p-3 text-white text-sm font-bold" placeholder="e.g. 50.0" />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm text-slate-300 mb-2">Identify sources of error and justify why Temperature MUST be in Kelvin.</label>
                <textarea value={answers.anomaly} onChange={e=>setAnswers({...answers, anomaly: e.target.value})} className="w-full h-40 bg-slate-900 border border-slate-700 rounded-lg p-3 text-white text-sm" />
              </div>
            )}
          </div>
        );
      case 8:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white">Conclusion</h3>
            <textarea value={answers.conclusion} onChange={e=>setAnswers({...answers, conclusion: e.target.value})} className="w-full h-40 bg-slate-900 border border-slate-700 rounded-lg p-3 text-white text-sm" placeholder="Summarize your findings and state the calculated activation energy..." />
          </div>
        );
      case 9:
        return (
          <div className="space-y-6 flex flex-col items-center justify-center py-10">
            <h3 className="text-2xl font-bold text-white mb-2">Submit Kinetics Report</h3>
            <button onClick={handleSubmit} disabled={submitting || results.length === 0} className="px-8 py-4 rounded-xl text-lg font-bold text-white bg-pink-600 hover:bg-pink-500 disabled:opacity-50">
              {submitting ? 'Submitting...' : 'Submit to Teacher'}
            </button>
          </div>
        );
      default: return null;
    }
  };

  return <U6SimulationWrapper experiment={experiment} onClose={onClose} renderStage={renderStage} />;
}
