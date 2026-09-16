import { useState } from 'react';
import { createSubmission, type Experiment } from '@/services/api';

interface SimulationProps {
  experiment: Experiment;
  onClose: () => void;
  onSuccess: (score: number | null) => void;
}

export default function SeparationSimulation({ experiment, onClose, onSuccess }: SimulationProps) {
  const [step, setStep] = useState(0);
  const [sandMethod, setSandMethod] = useState('');
  const [saltMethod, setSaltMethod] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await createSubmission(experiment.id, {
        sand_separation_method: sandMethod,
        salt_separation_method: saltMethod
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
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)' }}>🧪</div>
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
        
        <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center relative">
          <h3 className="text-lg font-bold text-sky-400 mb-6 absolute top-6 left-6">Chemistry Lab Setup</h3>
          
          {step === 0 && (
            <div className="text-center animate-in fade-in">
              <div className="w-32 h-32 bg-slate-800 rounded-full flex items-center justify-center text-4xl mb-4 mx-auto border-4 border-slate-700">🏺</div>
              <h4 className="text-white font-bold mb-2">Mixture: Sand, Salt & Water</h4>
              <p className="text-slate-400 text-sm mb-6 max-w-xs">You have a beaker containing a mixture of insoluble sand and soluble salt dissolved in water.</p>
              <button 
                onClick={() => setStep(1)}
                className="px-6 py-2 bg-sky-600 rounded-lg text-white font-bold hover:bg-sky-500 transition-colors"
              >
                Start Separation
              </button>
            </div>
          )}

          {step === 1 && (
            <div className="text-center animate-in fade-in">
              <div className="w-32 h-32 bg-slate-800 rounded-lg flex items-center justify-center text-4xl mb-4 mx-auto border-2 border-sky-500/50">Y</div>
              <h4 className="text-white font-bold mb-2">Step 1: Filtration</h4>
              <p className="text-slate-400 text-sm mb-6 max-w-xs">Pouring the mixture through filter paper in a funnel. The sand (residue) stays on the paper, the salt water (filtrate) passes through.</p>
              <button 
                onClick={() => { setStep(2); setSandMethod('Filtration'); }}
                className="px-6 py-2 bg-sky-600 rounded-lg text-white font-bold hover:bg-sky-500 transition-colors"
              >
                Continue
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="text-center animate-in fade-in">
              <div className="w-32 h-32 bg-slate-800 rounded-b-xl flex items-center justify-center text-4xl mb-4 mx-auto border-b-4 border-orange-500 relative">
                <div className="absolute bottom-0 w-full h-1/2 bg-blue-500/30"></div>
                <div className="absolute -bottom-6 text-orange-500 text-2xl animate-pulse">🔥</div>
              </div>
              <h4 className="text-white font-bold mb-2">Step 2: Evaporation</h4>
              <p className="text-slate-400 text-sm mb-6 max-w-xs">Heating the salt water in an evaporating basin. The water evaporates, leaving solid salt crystals behind.</p>
              <button 
                onClick={() => { setStep(3); setSaltMethod('Evaporation'); }}
                className="px-6 py-2 bg-sky-600 rounded-lg text-white font-bold hover:bg-sky-500 transition-colors"
              >
                Finish Process
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="text-center animate-in fade-in">
              <div className="flex justify-center gap-4 mb-6">
                <div className="w-24 h-24 bg-slate-800 rounded-full flex flex-col items-center justify-center border border-slate-600">
                  <span className="text-2xl">🏜️</span>
                  <span className="text-xs text-slate-400 mt-1">Sand</span>
                </div>
                <div className="w-24 h-24 bg-slate-800 rounded-full flex flex-col items-center justify-center border border-slate-600">
                  <span className="text-2xl">🧂</span>
                  <span className="text-xs text-slate-400 mt-1">Salt</span>
                </div>
                <div className="w-24 h-24 bg-slate-800 rounded-full flex flex-col items-center justify-center border border-slate-600">
                  <span className="text-2xl">💧</span>
                  <span className="text-xs text-slate-400 mt-1">Water vapor</span>
                </div>
              </div>
              <h4 className="text-emerald-400 font-bold mb-2">Separation Complete!</h4>
              <p className="text-slate-400 text-sm">You have successfully separated the mixture.</p>
              <button 
                onClick={() => { setStep(0); setSandMethod(''); setSaltMethod(''); }}
                className="mt-6 px-4 py-2 border border-slate-600 rounded-lg text-slate-400 text-sm hover:bg-slate-800 transition-colors"
              >
                Reset Simulation
              </button>
            </div>
          )}

        </div>

        <div className="flex flex-col gap-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-violet-400 mb-4">Record Methods</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Method used to separate SAND:</label>
                <select 
                  value={sandMethod}
                  onChange={e => setSandMethod(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm"
                >
                  <option value="">Select method...</option>
                  <option value="Filtration">Filtration</option>
                  <option value="Evaporation">Evaporation</option>
                  <option value="Distillation">Distillation</option>
                  <option value="Chromatography">Chromatography</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Method used to separate SALT:</label>
                <select 
                  value={saltMethod}
                  onChange={e => setSaltMethod(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm"
                >
                  <option value="">Select method...</option>
                  <option value="Filtration">Filtration</option>
                  <option value="Evaporation">Evaporation</option>
                  <option value="Distillation">Distillation</option>
                  <option value="Chromatography">Chromatography</option>
                </select>
              </div>
            </div>
            
            {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
            
            <button 
              onClick={handleSubmit}
              disabled={submitting || !sandMethod || !saltMethod}
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
