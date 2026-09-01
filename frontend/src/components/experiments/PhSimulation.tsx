import React, { useState } from 'react';
import { createSubmission, type Experiment } from '@/services/api';

interface SimulationProps {
  experiment: Experiment;
  onClose: () => void;
  onSuccess: (score: number | null) => void;
}

export default function PhSimulation({ experiment, onClose, onSuccess }: SimulationProps) {
  // [H+] concentration ranges typically from 10^-1 to 10^-14
  // We'll let the user choose the exponent
  const [exponent, setExponent] = useState(-7);
  const [studentInput, setStudentInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const hydrogenConcentration = Math.pow(10, exponent);
  const actualPh = -Math.log10(hydrogenConcentration);

  // Derive colour based on actual pH for the indicator
  const getPhColor = (ph: number) => {
    if (ph <= 2) return '#ef4444'; // Red (strong acid)
    if (ph <= 4) return '#f97316'; // Orange
    if (ph <= 6) return '#eab308'; // Yellow
    if (ph === 7) return '#22c55e'; // Green (neutral)
    if (ph <= 9) return '#06b6d4'; // Cyan
    if (ph <= 11) return '#3b82f6'; // Blue
    return '#8b5cf6'; // Purple (strong base)
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setExponent(Number(e.target.value));
    setStudentInput('');
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const obs = {
        hydrogen_ion_concentration: hydrogenConcentration,
        ph: Number(studentInput)
      };
      const sub = await createSubmission(experiment.id, obs);
      onSuccess(sub.automatic_score ?? null);
    } catch (e: any) {
      setSubmitError(e.response?.data?.detail ?? 'Failed to submit report.');
    } finally {
      setSubmitting(false);
    }
  };

  const hasInput = !isNaN(Number(studentInput)) && studentInput.trim() !== '';

  return (
    <div className="fixed inset-0 z-50 flex flex-col"
         style={{ background: 'rgba(2,6,23,0.95)', backdropFilter: 'blur(16px)' }}>
      {/* Modal header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
               style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)' }}>🧪</div>
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

      <div className="flex-1 overflow-y-auto p-6 max-w-3xl mx-auto w-full">
        {/* Instructions banner */}
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3 mb-8">
          <p className="text-xs text-cyan-300 font-medium mb-1">📋 Lab Instructions</p>
          <p className="text-xs text-slate-400">{experiment.description}</p>
        </div>

        {/* Workspace */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Visual Simulation */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/5 bg-slate-900 p-6 shadow-xl relative overflow-hidden flex flex-col items-center justify-center h-64">
              <div className="absolute inset-0 opacity-20 pointer-events-none"
                   style={{ background: `radial-gradient(circle at 50% 50%, ${getPhColor(actualPh)} 0%, transparent 70%)` }} />
              
              {/* Beaker SVG */}
              <svg width="120" height="150" viewBox="0 0 120 150" className="z-10 transition-all duration-700 ease-in-out">
                <path d="M 20 20 L 20 130 A 10 10 0 0 0 30 140 L 90 140 A 10 10 0 0 0 100 130 L 100 20 M 10 20 L 110 20" 
                      fill="none" stroke="#94a3b8" strokeWidth="4" />
                <path d="M 22 70 L 22 130 A 8 8 0 0 0 30 138 L 90 138 A 8 8 0 0 0 98 130 L 98 70 Z" 
                      fill={getPhColor(actualPh)} className="transition-all duration-700" opacity="0.8" />
                
                {/* Measuring lines */}
                <line x1="20" y1="40" x2="35" y2="40" stroke="#94a3b8" strokeWidth="2" />
                <line x1="20" y1="60" x2="30" y2="60" stroke="#94a3b8" strokeWidth="2" />
                <line x1="20" y1="80" x2="35" y2="80" stroke="#94a3b8" strokeWidth="2" />
                <line x1="20" y1="100" x2="30" y2="100" stroke="#94a3b8" strokeWidth="2" />
                <line x1="20" y1="120" x2="35" y2="120" stroke="#94a3b8" strokeWidth="2" />
              </svg>
              
              <div className="mt-4 z-10 bg-slate-800/80 px-4 py-2 rounded-lg border border-white/10 backdrop-blur">
                <p className="text-sm text-slate-300 font-medium">Indicator Color</p>
              </div>
            </div>

            {/* Controls */}
            <div className="rounded-xl border border-white/5 bg-slate-900 p-5">
              <label className="flex justify-between text-sm text-slate-300 mb-2 font-medium">
                <span>[H⁺] Concentration (mol/L)</span>
                <span className="text-cyan-400 font-mono">10<sup className="text-xs">{exponent}</sup></span>
              </label>
              <input 
                type="range" 
                min="-14" max="-1" step="1" 
                value={exponent} onChange={handleSliderChange}
                className="w-full accent-cyan-500"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-2">
                <span>Basic (10⁻¹⁴)</span>
                <span>Neutral (10⁻⁷)</span>
                <span>Acidic (10⁻¹)</span>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="flex flex-col justify-center space-y-6">
            <div className="rounded-2xl border border-white/5 bg-slate-900 p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-white mb-4">Record Observation</h3>
              <p className="text-sm text-slate-400 mb-6">
                Based on the universal indicator color above, calculate and record the pH of the solution.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                    Calculated pH
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      value={studentInput}
                      onChange={(e) => setStudentInput(e.target.value)}
                      placeholder="e.g. 7.0"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-mono text-lg focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                    />
                  </div>
                </div>

                <div className="rounded-lg bg-slate-800/50 p-4 border border-white/5 mt-4">
                  <p className="text-xs text-slate-400 font-mono mb-1">
                    <span className="text-cyan-400">Formula:</span> pH = -log₁₀([H⁺])
                  </p>
                  <p className="text-xs text-slate-500 font-mono">
                    [H⁺] = 10<sup className="text-[10px]">{exponent}</sup> mol/L
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
              className="w-full rounded-xl py-4 text-sm font-bold text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(6,182,212,0.15)] hover:shadow-[0_0_25px_rgba(6,182,212,0.3)] disabled:shadow-none"
              style={{
                background: submitting || !hasInput
                  ? 'linear-gradient(135deg, #164e63, #0f172a)'
                  : 'linear-gradient(135deg, #06b6d4, #3b82f6)',
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
