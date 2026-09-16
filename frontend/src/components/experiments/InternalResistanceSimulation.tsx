import React, { useState } from 'react';
import { createSubmission, type Experiment } from '@/services/api';

interface SimulationProps {
  experiment: Experiment;
  onClose: () => void;
  onSuccess: (score: number | null) => void;
}

export default function InternalResistanceSimulation({ experiment, onClose, onSuccess }: SimulationProps) {
  const [resistance, setResistance] = useState<number>(5.0);
  const [switchClosed, setSwitchClosed] = useState(false);
  
  // Model parameters (secret)
  const EMF = 1.5;
  const r = 0.5;
  
  // Calculate readings with slight noise
  const generateReadings = () => {
    if (!switchClosed) return { v: EMF, i: 0.00 }; // Open circuit voltage is EMF
    
    const trueI = EMF / (resistance + r);
    const trueV = trueI * resistance;
    
    // Add ±1% noise
    const noiseI = trueI * (1 + (Math.random() * 0.02 - 0.01));
    const noiseV = trueV * (1 + (Math.random() * 0.02 - 0.01));
    
    return { v: noiseV, i: noiseI };
  };

  const { v: currentV, i: currentI } = generateReadings();

  // Data table
  const [recordedData, setRecordedData] = useState<{ v: number, i: number, r: number }[]>([]);
  
  const recordReading = () => {
    setRecordedData([...recordedData, { v: currentV, i: currentI, r: resistance }]);
  };

  const [inputEmf, setInputEmf] = useState('');
  const [inputR, setInputR] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!inputEmf || !inputR) {
      setSubmitError('Please enter EMF and internal resistance.');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const obs = {
        emf_V: Number(inputEmf),
        internal_resistance_ohm: Number(inputR),
        raw_data: recordedData
      };
      const sub = await createSubmission(experiment.id, obs);
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
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm bg-blue-500/20 text-blue-400">⚡</div>
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
        
        {/* Visual Simulation */}
        <div className="space-y-6 flex flex-col">
          <div className="rounded-2xl border border-white/5 bg-slate-900 p-8 shadow-xl relative min-h-[400px]">
            <h3 className="text-sm font-bold text-slate-300 mb-4 uppercase tracking-wider">Circuit Diagram</h3>
            
            <div className="relative h-64 border-2 border-slate-700 bg-slate-800/50 rounded-lg p-6">
              {/* Wires */}
              <div className="absolute top-10 left-10 right-10 h-0.5 bg-slate-500"></div>
              <div className="absolute bottom-16 left-10 right-10 h-0.5 bg-slate-500"></div>
              <div className="absolute top-10 bottom-16 left-10 w-0.5 bg-slate-500"></div>
              <div className="absolute top-10 bottom-16 right-10 w-0.5 bg-slate-500"></div>
              
              {/* Voltmeter parallel wires */}
              <div className="absolute top-10 top-24 left-1/4 w-0.5 h-14 bg-blue-500/50"></div>
              <div className="absolute top-10 top-24 right-1/4 w-0.5 h-14 bg-blue-500/50"></div>
              <div className="absolute top-24 left-1/4 right-1/4 h-0.5 bg-blue-500/50"></div>

              {/* Cell */}
              <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center bg-slate-800 px-2">
                <div className="w-1 h-8 bg-white mr-1"></div>
                <div className="w-1 h-4 bg-white mr-2"></div>
                <span className="text-xs font-mono text-slate-400">Cell (E, r)</span>
              </div>

              {/* Voltmeter */}
              <div className="absolute top-20 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full border-2 border-blue-400 bg-slate-900 flex items-center justify-center text-blue-400 font-bold z-10">V</div>
              
              {/* Switch */}
              <div className="absolute bottom-14 left-1/4 bg-slate-800 px-2 cursor-pointer z-10" onClick={() => setSwitchClosed(!switchClosed)}>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                  <div className={`w-8 h-1 bg-slate-300 origin-left transition-transform ${switchClosed ? 'rotate-0' : '-rotate-30'}`}></div>
                  <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                </div>
                <div className="text-[10px] text-center mt-1 text-slate-400">Switch</div>
              </div>

              {/* Ammeter */}
              <div className="absolute bottom-12 right-1/4 w-8 h-8 rounded-full border-2 border-red-400 bg-slate-900 flex items-center justify-center text-red-400 font-bold z-10">A</div>

              {/* Variable Resistor */}
              <div className="absolute top-1/2 right-6 -translate-y-1/2 bg-slate-800 py-2">
                <div className="w-4 h-12 border-2 border-white/50 relative">
                  <div className="absolute -left-2 top-1/2 w-0 h-0 border-y-4 border-y-transparent border-l-8 border-l-white"></div>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">R</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="bg-slate-950 border border-slate-700 rounded-lg p-3 text-center">
                <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Voltmeter (V)</div>
                <div className="text-2xl font-mono text-blue-400">{currentV.toFixed(2)}</div>
              </div>
              <div className="bg-slate-950 border border-slate-700 rounded-lg p-3 text-center">
                <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Ammeter (A)</div>
                <div className="text-2xl font-mono text-red-400">{currentI.toFixed(2)}</div>
              </div>
            </div>
            
            <div className="mt-6 flex flex-col">
              <label className="flex justify-between text-xs text-slate-400 mb-2">
                <span>External Resistance (R)</span>
                <span className="font-mono">{resistance.toFixed(1)} Ω</span>
              </label>
              <input type="range" min="1" max="15" step="0.5" value={resistance} onChange={e => setResistance(Number(e.target.value))} className="accent-blue-500" />
            </div>
            
            <button onClick={recordReading} className="mt-6 w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-bold border border-white/10">
              Record Reading
            </button>
          </div>
        </div>

        {/* Data & Analysis */}
        <div className="flex flex-col space-y-6">
          <div className="rounded-2xl border border-white/5 bg-slate-900 p-6 shadow-xl flex-1 flex flex-col">
            <h3 className="text-lg font-semibold text-white mb-4">Results Table</h3>
            
            <div className="border border-slate-800 rounded-xl overflow-hidden mb-6 flex-1">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-800/50 text-slate-400 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3">R (Ω)</th>
                    <th className="px-4 py-3">V (V)</th>
                    <th className="px-4 py-3">I (A)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {recordedData.map((d, i) => (
                    <tr key={i} className="hover:bg-slate-800/20">
                      <td className="px-4 py-2">{d.r.toFixed(1)}</td>
                      <td className="px-4 py-2">{d.v.toFixed(2)}</td>
                      <td className="px-4 py-2">{d.i.toFixed(2)}</td>
                    </tr>
                  ))}
                  {recordedData.length === 0 && (
                    <tr><td colSpan={3} className="px-4 py-6 text-center text-slate-500 italic">Record your readings.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* V vs I Graph */}
            {recordedData.length > 0 && (
              <div className="border-t border-slate-800 pt-4 mb-6">
                <h4 className="text-sm font-medium text-slate-300 mb-2">Graph: V against I</h4>
                <div className="h-40 bg-slate-950 rounded-xl border border-slate-800 relative p-4">
                   <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                    {/* Axes */}
                    <line x1="0" y1="100" x2="100" y2="100" stroke="#475569" strokeWidth="1" />
                    <line x1="0" y1="0" x2="0" y2="100" stroke="#475569" strokeWidth="1" />
                    {recordedData.map((d, i) => {
                      // max I roughly 1.0A (if R=1, r=0.5 -> I=1), max V roughly 1.5V
                      const x = (d.i / 1.5) * 100;
                      const y = 100 - (d.v / 2.0) * 100;
                      return <circle key={i} cx={`${x}%`} cy={`${y}%`} r="3" fill="#3b82f6" />;
                    })}
                   </svg>
                </div>
                <p className="text-[10px] text-slate-500 mt-2 text-center">Plot line of best fit. Intercept = EMF (E), Gradient = -r</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase">Determined EMF (V)</label>
                <input type="number" step="0.01" value={inputEmf} onChange={(e) => setInputEmf(e.target.value)}
                       className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-blue-400 mb-1.5 uppercase tracking-wider">Internal Resistance r (Ω)</label>
                <input type="number" step="0.01" value={inputR} onChange={(e) => setInputR(e.target.value)} placeholder="0.00"
                       className="w-full bg-slate-950 border border-blue-500/50 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.1)]" />
              </div>
            </div>
          </div>
          
          {submitError && <div className="text-red-400 text-sm">{submitError}</div>}
          
          <button
            onClick={handleSubmit} disabled={submitting}
            className="w-full rounded-xl py-4 text-sm font-bold text-white transition-all bg-blue-600 hover:bg-blue-500 disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </div>
    </div>
  );
}
