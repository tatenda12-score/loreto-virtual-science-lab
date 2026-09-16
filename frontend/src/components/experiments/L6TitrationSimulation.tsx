import React, { useState } from 'react';
import { createSubmission, type Experiment } from '@/services/api';

interface SimulationProps {
  experiment: Experiment;
  onClose: () => void;
  onSuccess: (score: number | null) => void;
}

export default function L6TitrationSimulation({ experiment, onClose, onSuccess }: SimulationProps) {
  const [buretteVolume, setBuretteVolume] = useState(0.0);
  const [flaskVolume, setFlaskVolume] = useState(25.0); // 25cm3 pipette
  const [titrantAdded, setTitrantAdded] = useState(0.0);
  
  // Endpoint simulation
  // Secret actual endpoint for the L6 titration (can be randomized or fixed for grading)
  const actualEndpoint = 25.0; // 25cm3
  
  const isEndpoint = titrantAdded >= actualEndpoint - 0.1 && titrantAdded <= actualEndpoint + 0.1;
  const isOverTitrated = titrantAdded > actualEndpoint + 0.1;
  
  const getFlaskColor = () => {
    if (isOverTitrated) return 'rgba(236, 72, 153, 0.9)'; // Dark pink
    if (isEndpoint) return 'rgba(244, 114, 182, 0.5)'; // Faint pink
    return 'rgba(255, 255, 255, 0.1)'; // Clear
  };

  const addTitrant = (amount: number) => {
    if (buretteVolume + amount > 50) return;
    setBuretteVolume(prev => prev + amount);
    setTitrantAdded(prev => prev + amount);
  };

  const resetBurette = () => {
    setBuretteVolume(0.0);
    setTitrantAdded(0.0);
  };

  const nextTrial = () => {
    setTitrantAdded(0.0);
  };

  // Data table
  const [trials, setTrials] = useState<Array<{ type: string, initial: number, final: number, titre: number, concordant: boolean }>>([
    { type: 'Rough', initial: 0, final: 0, titre: 0, concordant: false },
    { type: '1', initial: 0, final: 0, titre: 0, concordant: false },
    { type: '2', initial: 0, final: 0, titre: 0, concordant: false },
    { type: '3', initial: 0, final: 0, titre: 0, concordant: false },
  ]);

  const updateTrial = (index: number, field: string, value: number | boolean) => {
    const newTrials = [...trials];
    newTrials[index] = { ...newTrials[index], [field]: value };
    // auto calculate titre if updating initial/final
    if (field === 'initial' || field === 'final') {
      const init = field === 'initial' ? (value as number) : newTrials[index].initial;
      const fin = field === 'final' ? (value as number) : newTrials[index].final;
      newTrials[index].titre = Math.max(0, fin - init);
    }
    setTrials(newTrials);
  };

  const [inputMeanTitre, setInputMeanTitre] = useState('');
  const [inputConcentration, setInputConcentration] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!inputMeanTitre || !inputConcentration) {
      setSubmitError('Please enter mean titre and calculated concentration.');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const obs = {
        mean_titre_cm3: Number(inputMeanTitre),
        calculated_concentration: Number(inputConcentration),
        trials: trials
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
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm bg-pink-500/20 text-pink-400">💧</div>
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
          <div className="rounded-2xl border border-white/5 bg-slate-900 p-8 shadow-xl flex flex-col items-center justify-center min-h-[500px]">
            <div className="flex w-full justify-between mb-4">
              <div className="text-pink-400 font-mono text-sm border border-pink-500/30 px-3 py-1 rounded bg-pink-500/10">Burette Reading: {buretteVolume.toFixed(2)} cm³</div>
              <div className="flex gap-2">
                <button onClick={resetBurette} className="px-3 py-1 bg-slate-800 text-white rounded text-xs hover:bg-slate-700">Refill Burette</button>
                <button onClick={nextTrial} className="px-3 py-1 bg-slate-800 text-white rounded text-xs hover:bg-slate-700">New Flask</button>
              </div>
            </div>

            <div className="relative flex flex-col items-center">
              {/* Burette */}
              <div className="w-8 h-64 border-2 border-slate-500 rounded-t-sm relative bg-slate-800/30 overflow-hidden">
                <div 
                  className="absolute bottom-0 w-full bg-blue-400/20 transition-all duration-300"
                  style={{ height: `${100 - (buretteVolume / 50) * 100}%` }}
                />
                <div className="absolute w-full border-b border-blue-400/50" style={{ top: `${(buretteVolume / 50) * 100}%` }}></div>
                {/* Scale marks */}
                {[0, 10, 20, 30, 40, 50].map((v) => (
                  <div key={v} className="absolute w-2 h-0.5 bg-slate-500 left-0" style={{ top: `${(v / 50) * 100}%` }}></div>
                ))}
              </div>
              
              {/* Tap / Stopcock controls */}
              <div className="flex gap-2 mt-4 items-center border border-slate-700 p-2 rounded-lg bg-slate-800">
                <span className="text-xs text-slate-400 mr-2 uppercase">Tap</span>
                <button onClick={() => addTitrant(5.0)} className="px-2 py-1 bg-slate-700 rounded text-xs text-white hover:bg-slate-600">Fast (+5)</button>
                <button onClick={() => addTitrant(1.0)} className="px-2 py-1 bg-slate-700 rounded text-xs text-white hover:bg-slate-600">Med (+1)</button>
                <button onClick={() => addTitrant(0.1)} className="px-2 py-1 bg-slate-700 rounded text-xs text-white hover:bg-slate-600">Drop (+0.1)</button>
              </div>
              
              {/* Flask */}
              <div className="mt-8 relative">
                <svg width="120" height="140" viewBox="0 0 100 120" className="z-10">
                  <path d="M 40 0 L 60 0 L 60 40 L 90 100 A 10 10 0 0 1 80 115 L 20 115 A 10 10 0 0 1 10 100 L 40 40 Z" 
                        fill="none" stroke="#94a3b8" strokeWidth="4" />
                  <path d="M 30 60 L 70 60 L 85 90 A 5 5 0 0 1 80 105 L 20 105 A 5 5 0 0 1 15 90 Z" 
                        fill={getFlaskColor()} className="transition-all duration-300" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Data & Form */}
        <div className="flex flex-col space-y-6">
          <div className="rounded-2xl border border-white/5 bg-slate-900 p-6 shadow-xl flex-1">
            <h3 className="text-lg font-semibold text-white mb-4">Titration Results</h3>
            
            <div className="border border-slate-800 rounded-xl overflow-hidden mb-6">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-800/50 text-slate-400 uppercase text-xs">
                  <tr>
                    <th className="px-3 py-3">Trial</th>
                    <th className="px-3 py-3">Initial (cm³)</th>
                    <th className="px-3 py-3">Final (cm³)</th>
                    <th className="px-3 py-3">Titre (cm³)</th>
                    <th className="px-3 py-3 text-center">Concordant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {trials.map((trial, i) => (
                    <tr key={i} className="hover:bg-slate-800/20">
                      <td className="px-3 py-2 font-medium">{trial.type}</td>
                      <td className="px-3 py-2"><input type="number" step="0.05" value={trial.initial} onChange={e => updateTrial(i, 'initial', Number(e.target.value))} className="w-16 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs" /></td>
                      <td className="px-3 py-2"><input type="number" step="0.05" value={trial.final} onChange={e => updateTrial(i, 'final', Number(e.target.value))} className="w-16 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs" /></td>
                      <td className="px-3 py-2 text-pink-400 font-mono">{trial.titre.toFixed(2)}</td>
                      <td className="px-3 py-2 text-center">
                        <input type="checkbox" checked={trial.concordant} onChange={e => updateTrial(i, 'concordant', e.target.checked)} className="accent-pink-500" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-4 border-t border-slate-800 pt-6">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase">Mean Concordant Titre (cm³)</label>
                <input type="number" step="0.01" value={inputMeanTitre} onChange={(e) => setInputMeanTitre(e.target.value)}
                       className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-pink-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-pink-400 mb-1.5 uppercase tracking-wider">Calculated Unknown Concentration (mol dm⁻³)</label>
                <input type="number" step="0.001" value={inputConcentration} onChange={(e) => setInputConcentration(e.target.value)} placeholder="0.000"
                       className="w-full bg-slate-950 border border-pink-500/50 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.1)]" />
              </div>
            </div>
          </div>
          
          {submitError && <div className="text-red-400 text-sm">{submitError}</div>}
          
          <button
            onClick={handleSubmit} disabled={submitting}
            className="w-full rounded-xl py-4 text-sm font-bold text-white transition-all bg-pink-600 hover:bg-pink-500 disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </div>
    </div>
  );
}
