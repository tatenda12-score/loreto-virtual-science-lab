import React, { useState } from 'react';
import { type Experiment } from '@/services/api';

export const STAGES = [
  'Brief', 'Plan', 'Practical', 'Results', 'Calculate', 
  'Graph', 'Analyze', 'Evaluate', 'Conclusion', 'Submit'
];

interface U6SimulationWrapperProps {
  experiment: Experiment;
  onClose: () => void;
  renderStage: (stage: number, nextStage: () => void, prevStage: () => void) => React.ReactNode;
}

export default function U6SimulationWrapper({ experiment, onClose, renderStage }: U6SimulationWrapperProps) {
  const [currentStage, setCurrentStage] = useState(0);

  const nextStage = () => setCurrentStage(s => Math.min(s + 1, STAGES.length - 1));
  const prevStage = () => setCurrentStage(s => Math.max(s - 1, 0));

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'rgba(2,6,23,0.95)', backdropFilter: 'blur(16px)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0 bg-slate-900/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm bg-purple-500/20 text-purple-400">🎓</div>
          <div>
            <h2 className="text-base font-bold text-white">{experiment.title}</h2>
            <p className="text-xs text-slate-400">Upper 6 · {experiment.subject}</p>
          </div>
        </div>
        <button onClick={onClose} className="px-3 py-1.5 border border-white/10 text-slate-300 rounded-lg hover:bg-white/5 transition-colors text-sm font-medium">
          ✕ Close
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-800 h-1.5 flex">
        {STAGES.map((s, i) => (
          <div key={s} className="flex-1 h-full border-r border-slate-900 last:border-0 relative">
            <div className={`absolute inset-0 transition-all duration-300 ${i <= currentStage ? 'bg-purple-500' : 'bg-transparent'}`} />
          </div>
        ))}
      </div>
      
      {/* Stage Indicators */}
      <div className="flex justify-between px-6 py-3 bg-slate-900/30 border-b border-white/5 text-[10px] uppercase font-bold tracking-wider shrink-0 overflow-x-auto">
        {STAGES.map((s, i) => (
          <div key={s} className={`px-2 flex-1 text-center whitespace-nowrap ${i === currentStage ? 'text-purple-400' : (i < currentStage ? 'text-slate-300' : 'text-slate-600')}`}>
            <span className="hidden sm:inline">{i + 1}. </span>{s}
          </div>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full relative">
        {renderStage(currentStage, nextStage, prevStage)}
      </div>
      
      {/* Footer Navigation */}
      <div className="p-4 border-t border-white/5 bg-slate-900/80 shrink-0 flex justify-between items-center max-w-7xl mx-auto w-full">
        <button 
          onClick={prevStage} 
          disabled={currentStage === 0}
          className="px-6 py-2.5 rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 transition-colors text-sm font-bold disabled:opacity-30"
        >
          ← Previous
        </button>
        <div className="text-xs text-slate-500 font-mono">Stage {currentStage + 1} of {STAGES.length}</div>
        <button 
          onClick={nextStage} 
          disabled={currentStage === STAGES.length - 1}
          className="px-6 py-2.5 rounded-lg bg-purple-600 text-white hover:bg-purple-500 transition-colors text-sm font-bold disabled:opacity-30"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
