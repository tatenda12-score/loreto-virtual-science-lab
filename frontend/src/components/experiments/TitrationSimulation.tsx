import React, { useState } from 'react';
import { createSubmission, type Experiment } from '@/services/api';

interface SimulationProps {
  experiment: Experiment;
  onClose: () => void;
  onSuccess: (score: number | null) => void;
}

export default function TitrationSimulation({ experiment, onClose, onSuccess }: SimulationProps) {
  // Typical Titration: adding Acid to Base
  const [acidVolume, setAcidVolume] = useState(0); // Slider for burette
  
  // Student inputs
  const [inputAcidMolarity, setInputAcidMolarity] = useState('0.1');
  const [inputBaseVolume, setInputBaseVolume] = useState('25.0');
  const [inputBaseMolarity, setInputBaseMolarity] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Endpoint logic: assume endpoint happens at acidVolume = 20mL (just for visual effect)
  // In reality, the student finds equivalence. For the visual, we change color around 20mL.
  const isEndpoint = acidVolume >= 19.5 && acidVolume <= 20.5;
  const isOverTitrated = acidVolume > 20.5;
  
  const getFlaskColor = () => {
    if (isOverTitrated) return 'rgba(236, 72, 153, 0.8)'; // Dark pink (Phenolphthalein over-titrated)
    if (isEndpoint) return 'rgba(244, 114, 182, 0.4)'; // Faint pink (Endpoint)
    return 'rgba(255, 255, 255, 0.1)'; // Clear (Basic)
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const obs = {
        volume_acid_ml: Number(acidVolume),
        molarity_acid: Number(inputAcidMolarity),
        volume_base_ml: Number(inputBaseVolume),
        molarity_base: Number(inputBaseMolarity),
      };
      const sub = await createSubmission(experiment.id, obs);
      onSuccess(sub.automatic_score ?? null);
    } catch (e: any) {
      setSubmitError(e.response?.data?.detail ?? 'Failed to submit report.');
    } finally {
      setSubmitting(false);
    }
  };

  const hasInput = !isNaN(Number(inputBaseMolarity)) && inputBaseMolarity.trim() !== '';

  return (
    <div className="fixed inset-0 z-50 flex flex-col"
         style={{ background: 'rgba(2,6,23,0.95)', backdropFilter: 'blur(16px)' }}>
      {/* Modal header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
               style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}>💧</div>
          <div>
            <h2 className="text-base font-bold text-white">{experiment.title}</h2>
            <p className="text-xs text-slate-400">{experiment.subject} · {experiment.difficulty} · Interactive Simulation</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg px-3 py-1.5 border border-white/10 text-slate-300 hover:bg-white/5 transition-colors text-sm"
        >
          ✕ Close
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full">
        {/* Instructions banner */}
        <div className="rounded-xl border border-pink-500/20 bg-pink-500/5 px-4 py-3 mb-8">
          <p className="text-xs text-pink-300 font-medium mb-1">📋 Lab Instructions</p>
          <p className="text-xs text-slate-400">{experiment.description}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Visual Simulation */}
          <div className="space-y-6 flex flex-col items-center justify-center rounded-2xl border border-white/5 bg-slate-900 p-8 shadow-xl">
            <div className="relative w-full max-w-[200px] flex flex-col items-center">
              {/* Burette */}
              <div className="w-8 h-64 border-2 border-slate-600 rounded-t-sm relative bg-slate-800/30 overflow-hidden">
                <div 
                  className="absolute bottom-0 w-full bg-blue-500/30 transition-all duration-300"
                  style={{ height: `${100 - (acidVolume / 50) * 100}%` }}
                />
                {/* Scale marks */}
                {[0, 10, 20, 30, 40, 50].map((v) => (
                  <div key={v} className="absolute w-2 h-0.5 bg-slate-500 left-0" style={{ top: `${(v / 50) * 100}%` }}>
                    <span className="absolute left-3 -top-2 text-[10px] text-slate-400">{v}</span>
                  </div>
                ))}
              </div>
              
              {/* Stopcock */}
              <div className="w-12 h-4 border-2 border-slate-600 bg-slate-700 mt-1" />
              <div className="w-2 h-6 border-x-2 border-slate-600 bg-slate-800/30" />
              
              {/* Drops */}
              <div className="w-1 h-1 rounded-full bg-blue-500/50 mt-1 animate-ping" 
                   style={{ opacity: acidVolume > 0 && acidVolume < 50 ? 1 : 0 }} />

              {/* Flask */}
              <div className="mt-8 relative">
                <svg width="100" height="120" viewBox="0 0 100 120" className="z-10">
                  <path d="M 40 0 L 60 0 L 60 40 L 90 100 A 10 10 0 0 1 80 115 L 20 115 A 10 10 0 0 1 10 100 L 40 40 Z" 
                        fill="none" stroke="#94a3b8" strokeWidth="4" />
                  <path d="M 30 60 L 70 60 L 85 90 A 5 5 0 0 1 80 105 L 20 105 A 5 5 0 0 1 15 90 Z" 
                        fill={getFlaskColor()} className="transition-all duration-700" />
                </svg>
              </div>
            </div>

            <div className="w-full mt-6">
              <label className="flex justify-between text-sm text-slate-300 mb-2 font-medium">
                <span>Add Titrant (Acid) Volume</span>
                <span className="text-pink-400 font-mono">{acidVolume.toFixed(1)} mL</span>
              </label>
              <input 
                type="range" 
                min="0" max="50" step="0.5" 
                value={acidVolume} onChange={(e) => setAcidVolume(Number(e.target.value))}
                className="w-full accent-pink-500"
              />
            </div>
          </div>

          {/* Form */}
          <div className="flex flex-col space-y-6">
            <div className="rounded-2xl border border-white/5 bg-slate-900 p-6 shadow-xl flex-1">
              <h3 className="text-lg font-semibold text-white mb-6">Record Observation</h3>
              
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase">Acid Vol (mL)</label>
                    <input type="number" readOnly value={acidVolume} 
                           className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-300 font-mono text-sm cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase">Acid Molarity (M)</label>
                    <input type="number" step="0.1" value={inputAcidMolarity} onChange={(e) => setInputAcidMolarity(e.target.value)}
                           className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-pink-500 focus:ring-1 focus:ring-pink-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase">Base Vol (mL)</label>
                    <input type="number" step="1" value={inputBaseVolume} onChange={(e) => setInputBaseVolume(e.target.value)}
                           className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-pink-500 focus:ring-1 focus:ring-pink-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-pink-400 mb-1.5 uppercase tracking-wider">Calc Base Molarity (M)</label>
                    <input type="number" step="0.01" value={inputBaseMolarity} onChange={(e) => setInputBaseMolarity(e.target.value)} placeholder="0.00"
                           className="w-full bg-slate-950 border border-pink-500/50 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-pink-500 focus:ring-1 focus:ring-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.1)]" />
                  </div>
                </div>

                <div className="rounded-lg bg-slate-800/50 p-4 border border-white/5 mt-6">
                  <p className="text-xs text-slate-400 font-mono mb-2">
                    <span className="text-pink-400">Formula:</span> M₁V₁ = M₂V₂
                  </p>
                  <p className="text-xs text-slate-500 font-mono">
                    Calculate the unknown base molarity (M₂) using the equivalence point volume you found above.
                  </p>
                </div>
              </div>
            </div>

            {submitError && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {submitError}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting || !hasInput}
              className="w-full rounded-xl py-4 text-sm font-bold text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(236,72,153,0.15)] hover:shadow-[0_0_25px_rgba(236,72,153,0.3)] disabled:shadow-none"
              style={{
                background: submitting || !hasInput
                  ? 'linear-gradient(135deg, #831843, #0f172a)'
                  : 'linear-gradient(135deg, #ec4899, #8b5cf6)',
              }}
            >
              {submitting ? 'Submitting...' : 'Submit Observation'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
