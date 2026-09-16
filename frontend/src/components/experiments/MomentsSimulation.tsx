import { useState } from 'react';
import { createSubmission, type Experiment } from '@/services/api';

interface SimulationProps {
  experiment: Experiment;
  onClose: () => void;
  onSuccess: (score: number | null) => void;
}

export default function MomentsSimulation({ experiment, onClose, onSuccess }: SimulationProps) {
  const [leftMass, setLeftMass] = useState(1);
  const [leftDistance, setLeftDistance] = useState(0.4);
  const [rightMass, setRightMass] = useState(1);
  const [rightDistance, setRightDistance] = useState(0.6);
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [observations, setObservations] = useState({
    trial1_moment: '',
    trial2_moment: ''
  });

  const g = 10;
  const leftForce = leftMass * g;
  const rightForce = rightMass * g;
  const leftMoment = leftForce * leftDistance;
  const rightMoment = rightForce * rightDistance;
  
  const maxTilt = 15;
  const netMoment = rightMoment - leftMoment;
  const tiltAngle = Math.max(-maxTilt, Math.min(maxTilt, netMoment * 2));

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await createSubmission(experiment.id, {
        trial1_moment: parseFloat(observations.trial1_moment),
        trial2_moment: parseFloat(observations.trial2_moment)
      });
      onSuccess(result.automatic_score);
    } catch (e) {
      setError('Failed to submit. Check your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'rgba(2,6,23,0.95)', backdropFilter: 'blur(16px)' }}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>⚖️</div>
          <div>
            <h2 className="text-base font-bold text-white">{experiment.title}</h2>
            <p className="text-xs text-slate-400">{experiment.subject} · {experiment.difficulty}</p>
          </div>
        </div>
        <button onClick={onClose} className="rounded-lg px-3 py-1.5 border border-white/10 text-slate-300 hover:bg-white/5 transition-colors text-sm">
          ✕ Close
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 flex flex-col items-center relative">
          <h3 className="text-lg font-bold text-indigo-400 mb-6 absolute top-6 left-6">Metre Rule Setup</h3>
          
          <div className="w-full mt-24 relative flex justify-center items-center h-48">
            
            <div className="relative w-full max-w-lg flex flex-col items-center">
              
              <div 
                className="w-full h-4 bg-yellow-600 rounded-sm shadow-lg relative border-b-2 border-yellow-800 transition-transform duration-500 ease-out z-10"
                style={{ transform: `rotate(${tiltAngle}deg)` }}
              >
                <div className="absolute inset-x-0 bottom-0 h-1 flex justify-between px-2">
                  {[...Array(11)].map((_, i) => (
                    <div key={i} className="w-px h-full bg-yellow-900"></div>
                  ))}
                </div>
                
                <div 
                  className="absolute bottom-full mb-1 w-8 bg-slate-400 border border-slate-600 rounded-t-sm flex items-center justify-center text-xs font-bold text-slate-900"
                  style={{ left: `${(0.5 - leftDistance) * 100}%`, transform: 'translateX(-50%)', height: `${leftMass * 20}px` }}
                >
                  {leftMass}kg
                </div>

                <div 
                  className="absolute bottom-full mb-1 w-8 bg-slate-400 border border-slate-600 rounded-t-sm flex items-center justify-center text-xs font-bold text-slate-900"
                  style={{ left: `${(0.5 + rightDistance) * 100}%`, transform: 'translateX(-50%)', height: `${rightMass * 20}px` }}
                >
                  {rightMass}kg
                </div>
              </div>

              <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-b-[20px] border-b-slate-500 mt-0 z-0"></div>
              <div className="w-8 h-4 bg-slate-700 rounded-b-sm"></div>
              
            </div>
            
          </div>
          
          <div className="w-full grid grid-cols-2 gap-8 mt-12 bg-slate-800/50 p-6 rounded-xl border border-white/5">
            <div>
              <h4 className="text-sm font-bold text-slate-300 mb-4 border-b border-white/10 pb-2">Left Side (Anticlockwise)</h4>
              <div className="mb-4">
                <label className="text-xs text-slate-400 flex justify-between">
                  <span>Mass (kg)</span>
                  <span className="text-emerald-400 font-mono">{leftMass} kg</span>
                </label>
                <input type="range" min="0.5" max="3" step="0.5" value={leftMass} onChange={e => setLeftMass(parseFloat(e.target.value))} className="w-full accent-emerald-500" />
              </div>
              <div>
                <label className="text-xs text-slate-400 flex justify-between">
                  <span>Distance from Pivot (m)</span>
                  <span className="text-emerald-400 font-mono">{leftDistance} m</span>
                </label>
                <input type="range" min="0.1" max="0.5" step="0.1" value={leftDistance} onChange={e => setLeftDistance(parseFloat(e.target.value))} className="w-full accent-emerald-500" />
              </div>
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-300 mb-4 border-b border-white/10 pb-2">Right Side (Clockwise)</h4>
              <div className="mb-4">
                <label className="text-xs text-slate-400 flex justify-between">
                  <span>Mass (kg)</span>
                  <span className="text-rose-400 font-mono">{rightMass} kg</span>
                </label>
                <input type="range" min="0.5" max="3" step="0.5" value={rightMass} onChange={e => setRightMass(parseFloat(e.target.value))} className="w-full accent-rose-500" />
              </div>
              <div>
                <label className="text-xs text-slate-400 flex justify-between">
                  <span>Distance from Pivot (m)</span>
                  <span className="text-rose-400 font-mono">{rightDistance} m</span>
                </label>
                <input type="range" min="0.1" max="0.5" step="0.1" value={rightDistance} onChange={e => setRightDistance(parseFloat(e.target.value))} className="w-full accent-rose-500" />
              </div>
            </div>
          </div>
          
        </div>

        <div className="flex flex-col gap-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-violet-400 mb-4">Calculations & Report</h3>
            
            <div className="bg-slate-800/80 p-4 rounded-lg mb-6 border border-slate-700 text-sm text-slate-300">
              <p className="mb-2"><strong className="text-slate-200">Formula:</strong> Moment = Force × Distance</p>
              <p><strong className="text-slate-200">Note:</strong> Assume g = 10 N/kg for Force calculation.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Trial 1 Moment Calculation (Nm):</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={observations.trial1_moment}
                  onChange={e => setObservations({...observations, trial1_moment: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm font-mono"
                  placeholder="e.g. 0.40"
                />
                <p className="text-xs text-slate-500 mt-1">Calculate the moment required to balance.</p>
              </div>
              
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Trial 2 Moment Calculation (Nm):</label>
                <input 
                  type="number"
                  step="0.01"
                  value={observations.trial2_moment}
                  onChange={e => setObservations({...observations, trial2_moment: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm font-mono"
                  placeholder="e.g. 0.60"
                />
              </div>
            </div>
            
            {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
            
            <button 
              onClick={handleSubmit}
              disabled={submitting || !observations.trial1_moment || !observations.trial2_moment}
              className="mt-6 w-full py-3 bg-blue-600 rounded-xl font-bold text-white hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Lab Report'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
