import React, { useState, useEffect, useRef } from 'react';
import { createSubmission, type Experiment } from '@/services/api';

interface SimulationProps {
  experiment: Experiment;
  onClose: () => void;
  onSuccess: (score: number | null) => void;
}

export default function VelocitySimulation({ experiment, onClose, onSuccess }: SimulationProps) {
  const [distance, setDistance] = useState(100);
  const [time, setTime] = useState(10);
  const [studentInput, setStudentInput] = useState('');
  
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 1
  
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const animationRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  const startSimulation = () => {
    setIsRunning(true);
    setProgress(0);
    startTimeRef.current = performance.now();
    
    const animate = (timeNow: number) => {
      if (!startTimeRef.current) return;
      const elapsed = (timeNow - startTimeRef.current) / 1000; // in seconds
      const p = Math.min(elapsed / time, 1);
      setProgress(p);
      
      if (p < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsRunning(false);
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const obs = {
        distance_m: distance,
        time_s: time,
        velocity_ms: Number(studentInput)
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
               style={{ background: 'linear-gradient(135deg, #eab308, #ea580c)' }}>🚀</div>
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
        <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 px-4 py-3 mb-8">
          <p className="text-xs text-orange-300 font-medium mb-1">📋 Lab Instructions</p>
          <p className="text-xs text-slate-400">{experiment.description}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Visual Simulation */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/5 bg-slate-900 p-6 shadow-xl relative overflow-hidden flex flex-col justify-center h-48">
              {/* Track */}
              <div className="w-full h-2 bg-slate-700 rounded-full relative mt-12">
                <div className="absolute top-0 left-0 w-full h-full bg-slate-600 rounded-full" />
                {/* Distance markers */}
                <div className="absolute top-4 left-0 text-[10px] text-slate-500 font-mono">0m</div>
                <div className="absolute top-4 right-0 text-[10px] text-slate-500 font-mono">{distance}m</div>
                
                {/* Object */}
                <div 
                  className="absolute -top-6 w-8 h-8 bg-gradient-to-r from-orange-400 to-yellow-500 rounded-full shadow-[0_0_15px_rgba(234,88,12,0.6)] flex items-center justify-center"
                  style={{ left: `calc(${progress * 100}% - 16px)` }}
                >
                  <span className="text-[10px] font-bold">🚀</span>
                </div>
              </div>

              <div className="mt-8 flex justify-between items-end">
                <div className="text-center font-mono">
                  <span className="block text-2xl text-orange-400">{(progress * time).toFixed(1)}</span>
                  <span className="text-xs text-slate-500 uppercase">Seconds</span>
                </div>
                <button
                  onClick={startSimulation}
                  disabled={isRunning}
                  className="px-6 py-2 bg-slate-800 border border-slate-700 hover:border-orange-500/50 text-orange-400 font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  {isRunning ? 'Running...' : 'Start Trial'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-white/5 bg-slate-900 p-5">
                <label className="flex justify-between text-sm text-slate-300 mb-2 font-medium">
                  <span>Distance (m)</span>
                  <span className="text-yellow-400 font-mono">{distance}</span>
                </label>
                <input 
                  type="range" 
                  min="10" max="1000" step="10" 
                  value={distance} onChange={(e) => setDistance(Number(e.target.value))}
                  className="w-full accent-yellow-500"
                  disabled={isRunning}
                />
              </div>
              <div className="rounded-xl border border-white/5 bg-slate-900 p-5">
                <label className="flex justify-between text-sm text-slate-300 mb-2 font-medium">
                  <span>Time (s)</span>
                  <span className="text-orange-400 font-mono">{time}</span>
                </label>
                <input 
                  type="range" 
                  min="1" max="100" step="1" 
                  value={time} onChange={(e) => setTime(Number(e.target.value))}
                  className="w-full accent-orange-500"
                  disabled={isRunning}
                />
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="flex flex-col space-y-6">
            <div className="rounded-2xl border border-white/5 bg-slate-900 p-6 shadow-xl flex-1">
              <h3 className="text-lg font-semibold text-white mb-6">Record Observation</h3>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-medium text-orange-400 mb-1.5 uppercase tracking-wider">
                    Calculated Velocity (m/s)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={studentInput}
                    onChange={(e) => setStudentInput(e.target.value)}
                    placeholder="e.g. 10.5"
                    className="w-full bg-slate-950 border border-orange-500/50 rounded-xl px-4 py-3 text-white font-mono text-lg focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all shadow-[0_0_10px_rgba(234,88,12,0.1)]"
                  />
                </div>

                <div className="rounded-lg bg-slate-800/50 p-4 border border-white/5 mt-6">
                  <p className="text-xs text-slate-400 font-mono mb-2">
                    <span className="text-orange-400">Formula:</span> v = d / t
                  </p>
                  <p className="text-xs text-slate-500 font-mono">
                    Divide the total distance by the time it took the object to travel.
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
              className="w-full rounded-xl py-4 text-sm font-bold text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(234,88,12,0.15)] hover:shadow-[0_0_25px_rgba(234,88,12,0.3)] disabled:shadow-none"
              style={{
                background: submitting || !hasInput
                  ? 'linear-gradient(135deg, #7c2d12, #0f172a)'
                  : 'linear-gradient(135deg, #ea580c, #eab308)',
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
