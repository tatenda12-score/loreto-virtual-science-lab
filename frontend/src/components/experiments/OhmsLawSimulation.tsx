/**
 * src/components/experiments/OhmsLawSimulation.tsx
 * --------------------------------------------------
 * Interactive virtual Ohm's Law lab workspace.
 *
 * Features
 * --------
 *  - Animated SVG circuit diagram (battery → wire → resistor → ammeter → wire → battery)
 *  - Current-proportional electron animation (dots moving through the wire)
 *  - Voltage & Resistance sliders update the theoretical current in real time
 *  - Multimeter display with a glowing needle that sweeps based on current
 *  - Student types their observed reading to test understanding
 *  - Colour-coded accuracy feedback (green / amber / red)
 *  - "Submit Lab Report" posts to the backend and returns auto-grade score
 */

import { useEffect, useRef, useState } from 'react'
import { createSubmission } from '@/services/api'

// ── Types ────────────────────────────────────────────────────────────────────
interface Props {
  experimentId: number
  onSubmitSuccess: (score: number | null) => void
}

// ── Constants ─────────────────────────────────────────────────────────────────
const MIN_VOLTAGE    = 1
const MAX_VOLTAGE    = 24
const MIN_RESISTANCE = 1
const MAX_RESISTANCE = 100
const MAX_CURRENT    = MAX_VOLTAGE / MIN_RESISTANCE   // 24 A theoretical max

// ── Helpers ───────────────────────────────────────────────────────────────────
const round2 = (n: number) => Math.round(n * 100) / 100

/** Map a value from [inMin,inMax] → [outMin,outMax] */
const mapRange = (v: number, inMin: number, inMax: number, outMin: number, outMax: number) =>
  outMin + ((v - inMin) / (inMax - inMin)) * (outMax - outMin)

/** Needle sweep angle: 0 A → -90°, max A → +90° */
const needleAngle = (current: number) =>
  mapRange(Math.min(current, MAX_CURRENT), 0, MAX_CURRENT, -90, 90)

// ── Colour helpers ─────────────────────────────────────────────────────────────
function getAccuracyColour(pctError: number) {
  if (pctError <= 0.05) return { text: 'text-emerald-400', label: 'Excellent', bg: 'bg-emerald-500/10 border-emerald-500/30' }
  if (pctError <= 0.15) return { text: 'text-amber-400',   label: 'Close',     bg: 'bg-amber-500/10  border-amber-500/30' }
  return                       { text: 'text-red-400',     label: 'Off',       bg: 'bg-red-500/10    border-red-500/30' }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SVG Circuit Diagram
// ═══════════════════════════════════════════════════════════════════════════════
function CircuitSVG({ voltage, resistance, current }: { voltage: number; resistance: number; current: number }) {
  const animRef = useRef<SVGAnimateMotionElement[]>([])

  // Electron speed is proportional to current (higher current = faster dots)
  const speed = Math.max(0.4, 2.5 - current * 0.08)   // seconds per loop

  // Wire path for the circuit (rectangle)
  const PATH = "M 60 80 L 200 80 L 200 200 L 60 200 Z"

  const electrons = [0, 0.25, 0.5, 0.75]   // phase offsets

  return (
    <svg viewBox="0 0 260 280" className="w-full h-full" style={{ filter: 'drop-shadow(0 0 8px rgba(124,58,237,0.2))' }}>
      {/* ── Glow filter ── */}
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="glow-strong">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <linearGradient id="wireGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.6"/>
          <stop offset="100%" stopColor="#0891b2" stopOpacity="0.6"/>
        </linearGradient>
      </defs>

      {/* ── Circuit wires ── */}
      {/* Top wire */}
      <line x1="60" y1="80" x2="200" y2="80"  stroke="#334155" strokeWidth="3" strokeLinecap="round"/>
      {/* Right wire */}
      <line x1="200" y1="80" x2="200" y2="200" stroke="#334155" strokeWidth="3" strokeLinecap="round"/>
      {/* Bottom wire */}
      <line x1="200" y1="200" x2="60" y2="200" stroke="#334155" strokeWidth="3" strokeLinecap="round"/>
      {/* Left wire */}
      <line x1="60" y1="200" x2="60" y2="80"   stroke="#334155" strokeWidth="3" strokeLinecap="round"/>

      {/* ── Electron flow animation ── */}
      {electrons.map((offset, i) => (
        <circle key={i} r="4" fill="#7c3aed" opacity="0.85" filter="url(#glow)">
          <animateMotion
            dur={`${speed}s`}
            repeatCount="indefinite"
            begin={`${-offset * speed}s`}
            path={PATH}
          />
        </circle>
      ))}

      {/* ── BATTERY (left side, vertical) ── */}
      {/* Battery body */}
      <rect x="40" y="118" width="40" height="44" rx="4" fill="#1e293b" stroke="#475569" strokeWidth="1.5"/>
      {/* Battery + terminal */}
      <rect x="52" y="113" width="16" height="6" rx="2" fill="#22c55e"/>
      <text x="60" y="110" textAnchor="middle" fontSize="8" fill="#22c55e" fontWeight="bold">+</text>
      {/* Battery - terminal */}
      <rect x="52" y="161" width="16" height="6" rx="2" fill="#ef4444"/>
      <text x="60" y="176" textAnchor="middle" fontSize="8" fill="#ef4444" fontWeight="bold">−</text>
      {/* Battery cells */}
      <line x1="50" y1="130" x2="70" y2="130" stroke="#94a3b8" strokeWidth="2"/>
      <line x1="54" y1="136" x2="66" y2="136" stroke="#94a3b8" strokeWidth="1.5"/>
      <line x1="50" y1="142" x2="70" y2="142" stroke="#94a3b8" strokeWidth="2"/>
      <line x1="54" y1="148" x2="66" y2="148" stroke="#94a3b8" strokeWidth="1.5"/>
      {/* Voltage label */}
      <text x="60" y="195" textAnchor="middle" fontSize="9" fill="#a78bfa" fontWeight="bold">
        {voltage}V
      </text>

      {/* ── RESISTOR (top, horizontal) ── */}
      {/* Zig-zag resistor symbol */}
      <g transform="translate(95, 66)">
        <rect x="-5" y="-10" width="80" height="20" rx="3" fill="#1e293b" stroke="#475569" strokeWidth="1"/>
        <polyline
          points="0,0 10,-8 20,8 30,-8 40,8 50,-8 60,8 70,0"
          fill="none" stroke="#fb923c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        />
        <text x="35" y="18" textAnchor="middle" fontSize="8" fill="#fb923c" fontWeight="bold">
          {resistance}Ω
        </text>
      </g>

      {/* ── AMMETER / MULTIMETER (right side, vertical) ── */}
      <circle cx="200" cy="140" r="22" fill="#1e293b" stroke="#0891b2" strokeWidth="2" filter="url(#glow)"/>
      {/* Meter face arc */}
      <path d="M 182 148 A 18 18 0 0 1 218 148" fill="none" stroke="#1e3a5f" strokeWidth="10"/>
      {/* Needle */}
      <g transform={`rotate(${needleAngle(current)}, 200, 148)`}>
        <line x1="200" y1="148" x2="200" y2="130" stroke="#f97316" strokeWidth="2" strokeLinecap="round"
              filter="url(#glow-strong)"/>
        <circle cx="200" cy="148" r="3" fill="#f97316"/>
      </g>
      {/* Scale marks */}
      {[-70, -35, 0, 35, 70].map((deg, i) => {
        const r = (deg * Math.PI) / 180
        const x1 = 200 + Math.sin(r) * 16
        const y1 = 148 - Math.cos(r) * 16
        const x2 = 200 + Math.sin(r) * 20
        const y2 = 148 - Math.cos(r) * 20
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#475569" strokeWidth="1.5"/>
      })}
      {/* A label */}
      <text x="200" y="158" textAnchor="middle" fontSize="8" fill="#0891b2" fontWeight="bold">A</text>
      {/* Current readout below */}
      <text x="200" y="174" textAnchor="middle" fontSize="9" fill="#7dd3fc" fontWeight="bold">
        {round2(current)} A
      </text>

      {/* ── Labels ── */}
      <text x="60" y="240"  textAnchor="middle" fontSize="8" fill="#64748b">BATTERY</text>
      <text x="130" y="55"  textAnchor="middle" fontSize="8" fill="#64748b">RESISTOR</text>
      <text x="200" y="240" textAnchor="middle" fontSize="8" fill="#64748b">AMMETER</text>

      {/* ── Current intensity glow on wires ── */}
      <rect x="58" y="78" width="144" height="4" rx="2"
            fill={`rgba(124,58,237,${Math.min(current/MAX_CURRENT, 1) * 0.6})`}
            style={{ transition: 'fill 0.3s' }}/>
    </svg>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Multimeter digit display
// ═══════════════════════════════════════════════════════════════════════════════
function DigitalDisplay({ value, unit }: { value: string; unit: string }) {
  return (
    <div className="rounded-xl border border-cyan-500/20 bg-slate-950 px-4 py-2 flex items-end justify-center gap-1.5"
         style={{ boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5), 0 0 12px rgba(8,145,178,0.15)' }}>
      <span className="font-mono text-3xl font-bold tracking-widest text-cyan-400"
            style={{ textShadow: '0 0 12px rgba(34,211,238,0.8)' }}>
        {value}
      </span>
      <span className="font-mono text-base text-cyan-600 mb-1">{unit}</span>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Simulation Component
// ═══════════════════════════════════════════════════════════════════════════════
export default function OhmsLawSimulation({ experimentId, onSubmitSuccess }: Props) {
  const [voltage,      setVoltage]      = useState(12)
  const [resistance,   setResistance]   = useState(4)
  const [studentInput, setStudentInput] = useState('')
  const [submitting,   setSubmitting]   = useState(false)
  const [submitError,  setSubmitError]  = useState<string | null>(null)
  const [submitted,    setSubmitted]    = useState(false)

  // Theoretical current (what the ammeter shows)
  const theoreticalCurrent = round2(voltage / resistance)
  const power              = round2(voltage * theoreticalCurrent)

  // Student's parsed reading
  const studentVal  = parseFloat(studentInput)
  const hasInput    = !isNaN(studentVal) && studentInput.trim() !== ''
  const pctError    = hasInput ? Math.abs(studentVal - theoreticalCurrent) / theoreticalCurrent : null
  const accuracy    = pctError !== null ? getAccuracyColour(pctError) : null

  // Reset submission state when sliders change
  useEffect(() => { setSubmitted(false); setSubmitError(null) }, [voltage, resistance])

  async function handleSubmit() {
    if (!hasInput) { setSubmitError('Please enter your observed current reading first.'); return }
    setSubmitting(true)
    setSubmitError(null)
    try {
      const obs = {
        voltage_V:         voltage,
        resistance_ohm:    resistance,
        student_current_A: studentVal,
        current_A:         studentVal,      // graded against expected_values.current_A
        power_W:           round2(studentVal * voltage),  // graded against expected_values.power_W
      }
      const result = await createSubmission(experimentId, obs)
      setSubmitted(true)
      onSubmitSuccess(result.calculated_score)
    } catch {
      setSubmitError('Submission failed. Please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">

      {/* ══ LEFT: Circuit diagram ══════════════════════════════════════════════ */}
      <div className="rounded-2xl border border-white/10 bg-slate-900 p-4 flex flex-col">
        <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
          <span className="text-violet-400">⚡</span> Circuit Diagram
        </h3>

        {/* SVG Circuit */}
        <div className="flex-1 flex items-center justify-center min-h-[220px]">
          <div className="w-full max-w-[260px] aspect-square">
            <CircuitSVG voltage={voltage} resistance={resistance} current={theoreticalCurrent} />
          </div>
        </div>

        {/* Readouts row */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          {[
            { label: 'Voltage',    value: `${voltage}`,           unit: 'V',  color: 'text-emerald-400' },
            { label: 'Resistance', value: `${resistance}`,        unit: 'Ω',  color: 'text-amber-400'   },
            { label: 'Power',      value: `${power}`,             unit: 'W',  color: 'text-violet-400'  },
          ].map(({ label, value, unit, color }) => (
            <div key={label} className="rounded-lg bg-slate-800 border border-white/5 p-2 text-center">
              <p className={`text-sm font-mono font-bold ${color}`}>{value}<span className="text-xs ml-0.5">{unit}</span></p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ══ RIGHT: Controls + Submission ══════════════════════════════════════ */}
      <div className="flex flex-col gap-4">

        {/* ── Sliders ─────────────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-white/10 bg-slate-900 p-5 space-y-6">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <span className="text-cyan-400">🎛️</span> Variable Controls
          </h3>

          {/* Voltage slider */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-medium text-slate-400">Voltage (V)</label>
              <span className="text-sm font-bold font-mono text-emerald-400">{voltage} V</span>
            </div>
            <div className="relative">
              <input
                id="voltage-slider"
                type="range"
                min={MIN_VOLTAGE}
                max={MAX_VOLTAGE}
                step={1}
                value={voltage}
                onChange={(e) => setVoltage(Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #22c55e ${((voltage - MIN_VOLTAGE) / (MAX_VOLTAGE - MIN_VOLTAGE)) * 100}%, #1e293b ${((voltage - MIN_VOLTAGE) / (MAX_VOLTAGE - MIN_VOLTAGE)) * 100}%)`,
                  accentColor: '#22c55e',
                }}
              />
              <div className="flex justify-between text-xs text-slate-600 mt-1">
                <span>{MIN_VOLTAGE}V</span><span>{MAX_VOLTAGE}V</span>
              </div>
            </div>
          </div>

          {/* Resistance slider */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-medium text-slate-400">Resistance (Ω)</label>
              <span className="text-sm font-bold font-mono text-amber-400">{resistance} Ω</span>
            </div>
            <div className="relative">
              <input
                id="resistance-slider"
                type="range"
                min={MIN_RESISTANCE}
                max={MAX_RESISTANCE}
                step={1}
                value={resistance}
                onChange={(e) => setResistance(Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #f59e0b ${((resistance - MIN_RESISTANCE) / (MAX_RESISTANCE - MIN_RESISTANCE)) * 100}%, #1e293b ${((resistance - MIN_RESISTANCE) / (MAX_RESISTANCE - MIN_RESISTANCE)) * 100}%)`,
                  accentColor: '#f59e0b',
                }}
              />
              <div className="flex justify-between text-xs text-slate-600 mt-1">
                <span>{MIN_RESISTANCE}Ω</span><span>{MAX_RESISTANCE}Ω</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Digital Multimeter readout ───────────────────────────────────────── */}
        <div className="rounded-2xl border border-cyan-500/20 bg-slate-900 p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <span className="text-cyan-400">🔢</span> Multimeter Display
            <span className="ml-auto text-xs text-slate-500">(Theoretical)</span>
          </h3>
          <DigitalDisplay value={theoreticalCurrent.toFixed(3)} unit="A" />
          <p className="text-xs text-slate-600 mt-2 text-center">
            I = V / R = {voltage} / {resistance} = {theoreticalCurrent} A
          </p>
        </div>

        {/* ── Student observation input ────────────────────────────────────────── */}
        <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-1 flex items-center gap-2">
            <span className="text-violet-400">📝</span> Your Observation
          </h3>
          <p className="text-xs text-slate-500 mb-3">
            Read the ammeter above and enter your observed current value below.
          </p>

          <div className="flex gap-3 items-center">
            <input
              id="student-current-input"
              type="number"
              step="0.001"
              min="0"
              value={studentInput}
              onChange={(e) => { setStudentInput(e.target.value); setSubmitted(false) }}
              placeholder="e.g. 3.000"
              className="flex-1 rounded-lg border border-white/10 bg-slate-800 px-3 py-2.5 text-sm font-mono text-white placeholder-slate-600 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
            />
            <span className="text-sm text-slate-400 font-mono">A</span>
          </div>

          {/* Accuracy feedback */}
          {hasInput && accuracy && pctError !== null && (
            <div className={`mt-3 rounded-lg border px-3 py-2 ${accuracy.bg}`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold ${accuracy.text}`}>
                  {accuracy.label} — {(pctError * 100).toFixed(1)}% error
                </span>
                <div className="flex gap-1">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i}
                         className={`w-2 h-2 rounded-full transition-colors ${
                           i < Math.max(1, 5 - Math.round(pctError * 20))
                             ? accuracy.text.replace('text-', 'bg-')
                             : 'bg-slate-700'
                         }`} />
                  ))}
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Expected: {theoreticalCurrent} A · Your reading: {studentVal} A
              </p>
            </div>
          )}

          {/* Formula reminder */}
          <div className="mt-3 rounded-lg bg-slate-800/60 px-3 py-2 border border-white/5">
            <p className="text-xs text-slate-400 font-mono">
              <span className="text-violet-400">Ohm's Law:</span>  I = V / R
            </p>
            <p className="text-xs text-slate-500 mt-0.5 font-mono">
              I = {voltage}V / {resistance}Ω = <span className="text-cyan-400">{theoreticalCurrent} A</span>
            </p>
          </div>
        </div>

        {/* ── Submit button ─────────────────────────────────────────────────────── */}
        <div className="space-y-2">
          {submitError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {submitError}
            </div>
          )}

          {submitted ? (
            <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-center">
              <p className="text-green-400 text-sm font-semibold">Lab report submitted!</p>
              <p className="text-slate-400 text-xs mt-0.5">Adjust sliders to run another trial.</p>
            </div>
          ) : (
            <button
              id="submit-lab-report"
              onClick={handleSubmit}
              disabled={submitting || !hasInput}
              className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: submitting || !hasInput
                  ? 'linear-gradient(135deg, #3b0764, #1e3a8a)'
                  : 'linear-gradient(135deg, #7c3aed, #2563eb)',
                boxShadow: (!submitting && hasInput)
                  ? '0 4px 20px rgba(124, 58, 237, 0.4)'
                  : 'none',
              }}
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Submitting…
                </span>
              ) : '🔬 Submit Lab Report'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
