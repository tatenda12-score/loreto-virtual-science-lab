import React, { useState } from 'react';
import { createSubmission, type Experiment } from '@/services/api';
import U6SimulationWrapper from './U6SimulationWrapper';

interface SimulationProps {
  experiment: Experiment;
  onClose: () => void;
  onSuccess: (score: number | null) => void;
}

export default function YoungModulusSimulation({ experiment, onClose, onSuccess }: SimulationProps) {
  // --- Practical State ---
  const [diameterPos, setDiameterPos] = useState(0); // 1 to 3 for different positions
  const [diameters, setDiameters] = useState<number[]>([]);
  const [mass, setMass] = useState(0); // kg
  
  // Model
  const trueDiameter = 0.50; // mm
  const L = 2.0; // original length in meters
  const E = 120e9; // Young modulus in Pa (120 GPa, e.g. Copper)
  
  const measureDiameter = () => {
    // Generate diameter with slight noise ±0.02 mm
    const noise = (Math.random() * 0.04 - 0.02);
    setDiameters([...diameters, trueDiameter + noise]);
    setDiameterPos(p => p + 1);
  };

  const getExtension = (m: number) => {
    // F = mg
    const F = m * 9.81;
    // A = pi * (d/2)^2 = pi * d^2 / 4 (use true diameter for physics engine)
    const dMeters = (trueDiameter / 1000);
    const A = Math.PI * Math.pow(dMeters, 2) / 4;
    
    // E = (F * L) / (A * ext) => ext = (F * L) / (A * E)
    let extMeters = (F * L) / (A * E);
    
    // Plastic deformation if stress > yield stress (e.g. 200 MPa)
    const yieldStress = 200e6;
    const stress = F / A;
    if (stress > yieldStress) {
      extMeters *= 1.5; // Starts extending rapidly
    }
    
    const noise = (Math.random() * 0.0001 - 0.00005); // noise in meters
    return Math.max(0, (extMeters + noise) * 1000); // return in mm
  };

  const extensionMm = mass > 0 ? getExtension(mass) : 0;

  // --- Results State ---
  const [results, setResults] = useState<Array<{ id: number, mass: number, force: number, ext: number }>>([]);
  
  const addResult = () => {
    setResults([...results, { id: Date.now(), mass, force: mass * 9.81, ext: extensionMm }]);
  };

  // --- Calculations State ---
  const [calcs, setCalcs] = useState<Record<number, { stress: string, strain: string }>>({});
  
  const updateCalc = (id: number, field: string, val: string) => {
    setCalcs(prev => ({ ...prev, [id]: { ...(prev[id] || { stress: '', strain: '' }), [field]: val } }));
  };

  // --- Analysis State ---
  const [answers, setAnswers] = useState({
    meanDiameter: '',
    crossArea: '',
    youngModulus: '',
    uncertainty: '',
    conclusion: ''
  });

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        raw_data: results,
        calculations: calcs,
        analysis: answers,
        young_modulus_gpa: Number(answers.youngModulus)
      };
      const sub = await createSubmission(experiment.id, payload);
      onSuccess(sub.automatic_score ?? null);
    } catch (e: any) {
      alert("Submission failed: " + (e.response?.data?.detail ?? 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  const renderStage = (stage: number, next: () => void, prev: () => void) => {
    switch(stage) {
      case 0:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white">Experiment Brief</h3>
            <div className="prose prose-invert max-w-none text-slate-300">
              <p>Determine the Young Modulus of a metal wire.</p>
              <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                <h4 className="text-blue-400 font-bold mb-2">Relevant Formulas</h4>
                <p>{"$Stress (\\sigma) = \\frac{Force}{Area}$"}</p>
                <p>{"$Strain (\\varepsilon) = \\frac{Extension}{Original Length}$"}</p>
                <p>{"$Young Modulus (E) = \\frac{Stress}{Strain}$"}</p>
                <p>{"Area $A = \\frac{\\pi d^2}{4}$"}</p>
              </div>
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white">Experimental Planning</h3>
            <p className="text-slate-300">Before adding loads, you must measure the diameter of the wire using a micrometer screw gauge.</p>
            <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl space-y-4">
               <h4 className="font-bold text-white uppercase text-sm mb-4">Micrometer Readings</h4>
               <div className="flex gap-4 mb-4">
                 <button onClick={measureDiameter} disabled={diameterPos >= 3} className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-500 disabled:opacity-50">Measure Diameter (Pos {diameterPos + 1})</button>
               </div>
               <div className="flex gap-4">
                 {diameters.map((d, i) => (
                   <div key={i} className="bg-slate-800 px-4 py-2 rounded text-blue-400 font-mono">Reading {i+1}: {d.toFixed(3)} mm</div>
                 ))}
               </div>
               {diameters.length === 3 && (
                 <div className="mt-4 pt-4 border-t border-slate-700">
                   <label className="block text-xs text-slate-400 mb-1">Mean Diameter (mm)</label>
                   <input type="text" value={answers.meanDiameter} onChange={e=>setAnswers({...answers, meanDiameter: e.target.value})} className="bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white font-mono" placeholder="0.000" />
                 </div>
               )}
            </div>
          </div>
        );
      case 2:
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 relative min-h-[400px]">
              {/* Clamp stand and wire */}
              <div className="absolute left-10 top-0 w-4 h-full bg-slate-700"></div>
              <div className="absolute left-14 top-10 w-24 h-4 bg-slate-600"></div>
              
              {/* Wire stretching */}
              <div className="absolute left-20 top-14 w-0.5 bg-yellow-600 transition-all duration-300" style={{ height: `${200 + extensionMm * 10}px` }}></div>
              
              {/* Mass hanger */}
              <div className="absolute left-16 transition-all duration-300 flex flex-col items-center" style={{ top: `${200 + 14 + extensionMm * 10}px` }}>
                <div className="w-8 h-2 bg-slate-400"></div>
                <div className="w-1 h-10 bg-slate-400"></div>
                {Array.from({length: mass}).map((_, i) => (
                   <div key={i} className="w-12 h-4 bg-red-600 border border-red-800 rounded-sm mb-0.5"></div>
                ))}
              </div>
              
              {/* Scale */}
              <div className="absolute right-10 top-20 w-8 h-64 border-l border-slate-500 flex flex-col justify-between py-2 text-[8px] text-slate-400 font-mono">
                 <span>0 mm</span>
                 <span>1 mm</span>
                 <span>2 mm</span>
                 <span>3 mm</span>
                 <span>4 mm</span>
                 <span>5 mm</span>
              </div>
            </div>
            
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 space-y-6">
              <h3 className="font-bold text-white uppercase text-sm mb-4">Add Loads</h3>
              <div className="flex gap-2">
                <button onClick={()=>setMass(m => m + 1)} className="px-3 py-1 bg-slate-800 text-white rounded hover:bg-slate-700">+1 kg</button>
                <button onClick={()=>setMass(0)} className="px-3 py-1 bg-slate-800 text-white rounded hover:bg-slate-700">Remove All</button>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 text-center">
                   <div className="text-3xl font-mono text-white mb-1">{mass} kg</div>
                   <div className="text-xs text-slate-500 uppercase">Mass</div>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 text-center">
                   <div className="text-3xl font-mono text-blue-400 mb-1">{extensionMm.toFixed(3)}</div>
                   <div className="text-xs text-slate-500 uppercase">Extension (mm)</div>
                </div>
              </div>
              
              <button onClick={addResult} disabled={mass === 0} className="w-full py-3 mt-4 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-500 disabled:opacity-50">Record Result</button>
            </div>
          </div>
        );
      case 3:
      case 4:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white">{stage === 3 ? 'Raw Data' : 'Calculate Stress and Strain'}</h3>
            <p className="text-slate-400 text-sm">Force (N) = m × 9.81. Use Original Length $L = 2.0 m$.</p>
            {stage === 4 && (
              <div className="mb-4">
                <label className="text-xs text-slate-400 block mb-1">Cross-sectional Area ($m^2$)</label>
                <input type="text" value={answers.crossArea} onChange={e=>setAnswers({...answers, crossArea: e.target.value})} className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-white font-mono text-sm" placeholder="e.g. 1.96e-7" />
              </div>
            )}
            <table className="w-full text-left text-sm text-slate-300 border border-slate-800 rounded-xl overflow-hidden">
              <thead className="bg-slate-800">
                <tr>
                  <th className="px-3 py-3">Mass (kg)</th>
                  <th className="px-3 py-3">Force (N)</th>
                  <th className="px-3 py-3">Ext (mm)</th>
                  {stage === 4 && (
                    <>
                      <th className="px-3 py-3 text-blue-400">Stress (Pa)</th>
                      <th className="px-3 py-3 text-blue-400">Strain</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {results.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/30">
                    <td className="px-3 py-2">{r.mass}</td>
                    <td className="px-3 py-2">{r.force.toFixed(2)}</td>
                    <td className="px-3 py-2">{r.ext.toFixed(3)}</td>
                    {stage === 4 && (
                      <>
                        <td className="px-1 py-1"><input value={calcs[r.id]?.stress || ''} onChange={e=>updateCalc(r.id, 'stress', e.target.value)} className="w-24 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs" /></td>
                        <td className="px-1 py-1"><input value={calcs[r.id]?.strain || ''} onChange={e=>updateCalc(r.id, 'strain', e.target.value)} className="w-24 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs" /></td>
                      </>
                    )}
                  </tr>
                ))}
                {results.length === 0 && <tr><td colSpan={5} className="text-center py-8">No data.</td></tr>}
              </tbody>
            </table>
          </div>
        );
      case 5:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white">Graph Construction</h3>
            <p className="text-slate-400 text-sm">Force vs Extension. Identify the proportional region.</p>
            <div className="h-72 bg-slate-900 border border-slate-700 rounded-xl relative p-8">
              <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                <line x1="0" y1="100" x2="100" y2="100" stroke="#475569" />
                <line x1="0" y1="0" x2="0" y2="100" stroke="#475569" />
                {results.map((r) => {
                  const x = (r.ext / 5) * 100; // max expected ext ~ 5mm
                  const y = 100 - (r.force / 150) * 100; // max force ~ 150N (15kg)
                  return <circle key={r.id} cx={`${Math.max(0, Math.min(100, x))}%`} cy={`${Math.max(0, Math.min(100, y))}%`} r="2" fill="#3b82f6" />;
                })}
              </svg>
            </div>
          </div>
        );
      case 6:
      case 7:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white">{stage === 6 ? 'Young Modulus Calculation' : 'Evaluation of Uncertainties'}</h3>
            {stage === 6 ? (
              <div className="space-y-4">
                <p className="text-slate-400 text-sm">Determine Young Modulus from the gradient of your graph (or Stress/Strain data).</p>
                <div>
                  <label className="block text-sm text-blue-400 mb-2 font-bold uppercase tracking-wider">Calculated Young Modulus (GPa)</label>
                  <input type="text" value={answers.youngModulus} onChange={e=>setAnswers({...answers, youngModulus: e.target.value})} className="w-full bg-slate-900 border border-blue-500/50 rounded-lg p-3 text-white text-lg font-mono shadow-[0_0_10px_rgba(59,130,246,0.1)]" placeholder="e.g. 120" />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <label className="block text-sm text-slate-300 mb-2">Explain why uncertainty in diameter strongly affects the final Young Modulus calculation.</label>
                <textarea value={answers.uncertainty} onChange={e=>setAnswers({...answers, uncertainty: e.target.value})} className="w-full h-32 bg-slate-900 border border-slate-700 rounded-lg p-3 text-white text-sm" placeholder="Consider the relationship A ∝ d²..." />
              </div>
            )}
          </div>
        );
      case 8:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white">Conclusion</h3>
            <textarea value={answers.conclusion} onChange={e=>setAnswers({...answers, conclusion: e.target.value})} className="w-full h-40 bg-slate-900 border border-slate-700 rounded-lg p-3 text-white text-sm" placeholder="Summarize your findings and discuss whether the wire exceeded its elastic limit..." />
          </div>
        );
      case 9:
        return (
          <div className="space-y-6 flex flex-col items-center justify-center py-10">
            <h3 className="text-2xl font-bold text-white mb-2">Submit Report</h3>
            <button onClick={handleSubmit} disabled={submitting || results.length === 0} className="px-8 py-4 rounded-xl text-lg font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50">
              {submitting ? 'Submitting...' : 'Submit to Teacher'}
            </button>
          </div>
        );
      default: return null;
    }
  };

  return <U6SimulationWrapper experiment={experiment} onClose={onClose} renderStage={renderStage} />;
}
