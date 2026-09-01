import React, { useState } from 'react';
import { createSubmission, type Experiment } from '@/services/api';

interface SimulationProps {
  experiment: Experiment;
  onClose: () => void;
  onSuccess: (score: number | null) => void;
}

export default function MicroscopySimulation({ experiment, onClose, onSuccess }: SimulationProps) {
  const [zoom, setZoom] = useState(1);
  const [focus, setFocus] = useState(50); // 0 to 100, 50 is perfectly in focus
  const [studentObservation, setStudentObservation] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const blurAmount = Math.abs(focus - 50) / 5; // 0 blur at 50

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const obs = {
        zoom_level: zoom,
        focus_level: focus,
        observation: studentObservation
      };
      const sub = await createSubmission(experiment.id, obs);
      onSuccess(sub.automatic_score ?? null); // Usually null because manual grading
    } catch (e: any) {
      setSubmitError(e.response?.data?.detail ?? 'Failed to submit report.');
    } finally {
      setSubmitting(false);
    }
  };

  const hasInput = studentObservation.trim().length > 5;

  return (
    <div className="fixed inset-0 z-50 flex flex-col"
         style={{ background: 'rgba(2,6,23,0.95)', backdropFilter: 'blur(16px)' }}>
      {/* Modal header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
               style={{ background: 'linear-gradient(135deg, #22c55e, #10b981)' }}>🔬</div>
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

      <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 mb-8">
          <p className="text-xs text-emerald-300 font-medium mb-1">📋 Lab Instructions</p>
          <p className="text-xs text-slate-400">{experiment.description}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Visual Simulation */}
          <div className="space-y-6 flex flex-col items-center">
            {/* Microscope Viewport */}
            <div className="w-80 h-80 rounded-full border-8 border-slate-800 bg-black overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.15)] relative flex items-center justify-center">
              {/* Fake crosshairs */}
              <div className="absolute inset-0 pointer-events-none opacity-20">
                <div className="absolute top-1/2 left-0 w-full h-px bg-emerald-500" />
                <div className="absolute left-1/2 top-0 h-full w-px bg-emerald-500" />
                <div className="absolute inset-0 border border-emerald-500 rounded-full scale-50" />
                <div className="absolute inset-0 border border-emerald-500 rounded-full scale-75" />
              </div>

              {/* The "Slide" */}
              <div 
                className="w-[200%] h-[200%] transition-all duration-200 ease-out flex items-center justify-center"
                style={{
                  transform: `scale(${zoom})`,
                  filter: `blur(${blurAmount}px) sepia(0.5) hue-rotate(90deg) brightness(1.2)`,
                  background: 'radial-gradient(circle at center, #10b981 10%, transparent 20%), radial-gradient(circle at center, #059669 15%, transparent 30%)',
                  backgroundSize: '40px 40px, 60px 60px',
                  backgroundPosition: '0 0, 20px 20px',
                }}
              >
                {/* Cells simulation */}
                <div className="w-32 h-32 rounded-full border-2 border-emerald-700/50 flex items-center justify-center m-4">
                  <div className="w-8 h-8 rounded-full bg-emerald-800/80" /> {/* Nucleus */}
                </div>
                <div className="w-24 h-24 rounded-full border-2 border-emerald-700/50 flex items-center justify-center m-4">
                  <div className="w-6 h-6 rounded-full bg-emerald-800/80" />
                </div>
              </div>

              {/* Vignette */}
              <div className="absolute inset-0 rounded-full pointer-events-none"
                   style={{ boxShadow: 'inset 0 0 50px rgba(0,0,0,1)' }} />
            </div>

            <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
              <div className="rounded-xl border border-white/5 bg-slate-900 p-4">
                <label className="flex justify-between text-xs text-slate-300 mb-2 font-medium">
                  <span>Objective (Zoom)</span>
                  <span className="text-emerald-400 font-mono">{zoom}x</span>
                </label>
                <input 
                  type="range" 
                  min="1" max="4" step="0.5" 
                  value={zoom} onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>
              <div className="rounded-xl border border-white/5 bg-slate-900 p-4">
                <label className="flex justify-between text-xs text-slate-300 mb-2 font-medium">
                  <span>Coarse/Fine Focus</span>
                  <span className="text-emerald-400 font-mono">
                    {focus === 50 ? 'Sharp' : 'Blurry'}
                  </span>
                </label>
                <input 
                  type="range" 
                  min="0" max="100" step="1" 
                  value={focus} onChange={(e) => setFocus(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="flex flex-col space-y-6">
            <div className="rounded-2xl border border-white/5 bg-slate-900 p-6 shadow-xl flex-1 flex flex-col">
              <h3 className="text-lg font-semibold text-white mb-6">Qualitative Observation</h3>
              
              <div className="flex-1 flex flex-col">
                <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">
                  Describe the specimen structure
                </label>
                <textarea
                  value={studentObservation}
                  onChange={(e) => setStudentObservation(e.target.value)}
                  placeholder="I observed that the cell membrane..."
                  className="flex-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all resize-none min-h-[150px]"
                />
              </div>

              <div className="rounded-lg bg-slate-800/50 p-4 border border-white/5 mt-6">
                <p className="text-xs text-slate-400 font-mono mb-2">
                  <span className="text-emerald-400">Note:</span> Qualitative Data
                </p>
                <p className="text-xs text-slate-500 font-mono">
                  This submission will be graded manually by your teacher based on the detail and accuracy of your description.
                </p>
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
              className="w-full rounded-xl py-4 text-sm font-bold text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:shadow-[0_0_25px_rgba(16,185,129,0.3)] disabled:shadow-none"
              style={{
                background: submitting || !hasInput
                  ? 'linear-gradient(135deg, #064e3b, #0f172a)'
                  : 'linear-gradient(135deg, #10b981, #059669)',
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
