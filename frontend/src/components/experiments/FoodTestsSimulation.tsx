import { useState, useEffect } from 'react';
import { createSubmission, type Experiment } from '@/services/api';

interface SimulationProps {
  experiment: Experiment;
  onClose: () => void;
  onSuccess: (score: number | null) => void;
}

const FOODS = [
  { id: 'potato', name: 'Potato (Starch)', contains: ['starch'] },
  { id: 'egg', name: 'Egg White (Protein)', contains: ['protein'] },
  { id: 'oil', name: 'Cooking Oil (Lipids)', contains: ['lipids'] },
  { id: 'glucose', name: 'Glucose Solution', contains: ['sugar'] }
];

const REAGENTS = [
  { id: 'iodine', name: 'Iodine Solution', testsFor: 'starch', positiveColor: '#1e1b4b', negativeColor: '#b45309' },
  { id: 'biuret', name: 'Biuret Reagent', testsFor: 'protein', positiveColor: '#c084fc', negativeColor: '#3b82f6' },
  { id: 'benedict', name: "Benedict's Solution (Heat)", testsFor: 'sugar', positiveColor: '#b91c1c', negativeColor: '#3b82f6' },
  { id: 'ethanol', name: 'Ethanol (Emulsion)', testsFor: 'lipids', positiveColor: '#f8fafc', negativeColor: '#00000000' }
];

export default function FoodTestsSimulation({ experiment, onClose, onSuccess }: SimulationProps) {
  const [selectedFood, setSelectedFood] = useState(FOODS[0]);
  const [selectedReagent, setSelectedReagent] = useState(REAGENTS[0]);
  const [reactionColor, setReactionColor] = useState('#e2e8f0');
  
  const [observations, setObservations] = useState({
    potato_iodine_observation: '',
    potato_iodine_conclusion: '',
    egg_biuret_observation: '',
    egg_biuret_conclusion: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const performTest = () => {
    if (selectedFood.contains.includes(selectedReagent.testsFor)) {
      setReactionColor(selectedReagent.positiveColor);
    } else {
      setReactionColor(selectedReagent.negativeColor);
    }
  };

  useEffect(() => {
    setReactionColor('#e2e8f0');
  }, [selectedFood, selectedReagent]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await createSubmission(experiment.id, observations);
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
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{ background: 'linear-gradient(135deg, #10b981, #047857)' }}>🌿</div>
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
        
        <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 flex flex-col items-center">
          <h3 className="text-lg font-bold text-emerald-400 mb-6">Laboratory Bench</h3>
          
          <div className="flex w-full justify-around mb-8">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-300">Select Food Sample:</label>
              {FOODS.map(f => (
                <button 
                  key={f.id} 
                  onClick={() => setSelectedFood(f)}
                  className={`px-4 py-2 rounded-lg text-sm transition-all ${selectedFood.id === f.id ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-slate-800 border-white/5 text-slate-400'}`}
                >
                  {f.name}
                </button>
              ))}
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-300">Select Reagent:</label>
              {REAGENTS.map(r => (
                <button 
                  key={r.id} 
                  onClick={() => setSelectedReagent(r)}
                  className={`px-4 py-2 rounded-lg text-sm transition-all ${selectedReagent.id === r.id ? 'bg-violet-500/20 border-violet-500 text-violet-400' : 'bg-slate-800 border-white/5 text-slate-400'}`}
                >
                  {r.name}
                </button>
              ))}
            </div>
          </div>

          <div className="relative w-32 h-64 bg-slate-800/50 rounded-b-full border-2 border-t-0 border-white/20 overflow-hidden shadow-[0_0_20px_rgba(255,255,255,0.05)] mt-4">
            <div className="absolute inset-x-0 bottom-0 transition-all duration-700 ease-in-out" style={{ height: '60%', backgroundColor: reactionColor }}></div>
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent"></div>
          </div>
          
          <button 
            onClick={performTest}
            className="mt-8 px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl font-bold text-white shadow-lg hover:shadow-emerald-500/20 transition-all"
          >
            Add Reagent & Observe
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-violet-400 mb-4">Record Observations</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Potato + Iodine Observation:</label>
                <input 
                  type="text" 
                  value={observations.potato_iodine_observation}
                  onChange={e => setObservations({...observations, potato_iodine_observation: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm"
                  placeholder="e.g. Blue-black colour"
                />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Potato Conclusion:</label>
                <input 
                  type="text" 
                  value={observations.potato_iodine_conclusion}
                  onChange={e => setObservations({...observations, potato_iodine_conclusion: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm"
                  placeholder="e.g. Starch present"
                />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Egg + Biuret Observation:</label>
                <input 
                  type="text" 
                  value={observations.egg_biuret_observation}
                  onChange={e => setObservations({...observations, egg_biuret_observation: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm"
                  placeholder="e.g. Purple colour"
                />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Egg Conclusion:</label>
                <input 
                  type="text" 
                  value={observations.egg_biuret_conclusion}
                  onChange={e => setObservations({...observations, egg_biuret_conclusion: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm"
                  placeholder="e.g. Protein present"
                />
              </div>
            </div>
            
            {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
            
            <button 
              onClick={handleSubmit}
              disabled={submitting}
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
