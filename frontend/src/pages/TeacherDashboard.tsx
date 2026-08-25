/**
 * src/pages/TeacherDashboard.tsx
 * --------------------------------
 * Main dashboard for authenticated teachers.
 *
 * Sections
 * --------
 *  - Stats overview (total experiments, pending grading)
 *  - Experiment management with status filters and create/edit
 *  - Experiment Builder integration
 *  - Grading panel: click an experiment → view all student submissions
 *  - Inline grade form: feedback + score override per submission
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import ExperimentBuilder from '@/components/experiments/ExperimentBuilder'
import {
  fetchExperiments,
  fetchSubmissionsForExperiment,
  gradeSubmission,
  updateExperiment,
  type Experiment,
  type Submission,
} from '@/services/api'

// ── Helpers ─────────────────────────────────────────────────────────────────
const SUBJECT_BADGE: Record<string, string> = {
  Physics:   'bg-violet-500/20 text-violet-300 border-violet-500/30',
  Chemistry: 'bg-cyan-500/20   text-cyan-300   border-cyan-500/30',
  Biology:   'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
}

const SUB_STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  draft:     { label: 'Draft',     cls: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
  submitted: { label: 'Pending',   cls: 'bg-amber-500/20  text-amber-300  border-amber-500/30' },
  graded:    { label: 'Graded',    cls: 'bg-green-500/20  text-green-300  border-green-500/30' },
}

const EXP_STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  draft:     { label: 'Draft',     cls: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
  published: { label: 'Published', cls: 'bg-green-500/20  text-green-300  border-green-500/30' },
  archived:  { label: 'Archived',  cls: 'bg-amber-500/20  text-amber-300  border-amber-500/30' },
}

type TabType = 'experiments' | 'submissions'
type StatusFilter = 'all' | 'draft' | 'published' | 'archived'

// ── Component ────────────────────────────────────────────────────────────────
export default function TeacherDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [activeTab,     setActiveTab]     = useState<TabType>('experiments')
  const [experiments,   setExperiments]   = useState<Experiment[]>([])
  const [loadingExp,    setLoadingExp]    = useState(true)
  const [statusFilter,  setStatusFilter]  = useState<StatusFilter>('all')

  // Experiment Builder state
  const [showBuilder,   setShowBuilder]   = useState(false)
  const [editingExp,    setEditingExp]    = useState<Experiment | undefined>(undefined)

  // Grading panel state
  const [selectedExp,   setSelectedExp]   = useState<Experiment | null>(null)
  const [submissions,   setSubmissions]   = useState<Submission[]>([])
  const [loadingSubs,   setLoadingSubs]   = useState(false)
  const [gradingId,     setGradingId]     = useState<number | null>(null)
  const [feedback,      setFeedback]      = useState('')
  const [scoreInput,    setScoreInput]    = useState('')
  const [grading,       setGrading]       = useState(false)
  const [gradeMsg,      setGradeMsg]      = useState<string | null>(null)

  // ── Guards ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (user && user.role === 'student') navigate('/student', { replace: true })
    if (user && user.role === 'admin') navigate('/admin', { replace: true })
  }, [user, navigate])

  // ── Data fetching ────────────────────────────────────────────────────────
  useEffect(() => {
    refreshExperiments()
  }, [])

  function refreshExperiments() {
    setLoadingExp(true)
    fetchExperiments(0, 100)
      .then(setExperiments)
      .finally(() => setLoadingExp(false))
  }

  function loadSubmissions(exp: Experiment) {
    setSelectedExp(exp)
    setSubmissions([])
    setLoadingSubs(true)
    setGradingId(null)
    setActiveTab('submissions')
    fetchSubmissionsForExperiment(exp.id)
      .then(setSubmissions)
      .finally(() => setLoadingSubs(false))
  }

  // ── Experiment actions ─────────────────────────────────────────────────
  function handleCreateExperiment() {
    setEditingExp(undefined)
    setShowBuilder(true)
  }

  function handleEditExperiment(exp: Experiment) {
    setEditingExp(exp)
    setShowBuilder(true)
  }

  function handleBuilderSave() {
    setShowBuilder(false)
    setEditingExp(undefined)
    refreshExperiments()
  }

  function handleBuilderCancel() {
    setShowBuilder(false)
    setEditingExp(undefined)
  }

  async function handleStatusChange(exp: Experiment, newStatus: 'published' | 'archived' | 'draft') {
    try {
      const updated = await updateExperiment(exp.id, { status: newStatus })
      setExperiments(prev => prev.map(e => e.id === updated.id ? updated : e))
    } catch {
      // silently fail — user sees no change
    }
  }

  // ── Grade handler ────────────────────────────────────────────────────────
  async function handleGrade(subId: number) {
    setGrading(true)
    setGradeMsg(null)
    try {
      const score = scoreInput ? parseFloat(scoreInput) : undefined
      const updated = await gradeSubmission(subId, feedback, score)
      setSubmissions((prev) => prev.map((s) => (s.id === subId ? updated : s)))
      setGradingId(null)
      setFeedback('')
      setScoreInput('')
      setGradeMsg(`Submission #${subId} graded successfully.`)
      setTimeout(() => setGradeMsg(null), 3000)
    } catch {
      setGradeMsg('Failed to save grade. Please try again.')
    } finally {
      setGrading(false)
    }
  }

  // ── Derived stats ────────────────────────────────────────────────────────
  const pendingCount = submissions.filter((s) => s.status === 'submitted').length
  const gradedCount  = submissions.filter((s) => s.status === 'graded').length
  const filteredExps = statusFilter === 'all'
    ? experiments
    : experiments.filter(e => e.status === statusFilter)

  // ── Experiment Builder overlay ──────────────────────────────────────────
  if (showBuilder) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <nav className="border-b border-white/5 bg-slate-900/80 backdrop-blur sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                   style={{ background: 'linear-gradient(135deg, #7c3aed, #0891b2)' }}>🔬</div>
              <span className="font-semibold text-white">Virtual Science Lab</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                {editingExp ? 'Edit Experiment' : 'New Experiment'}
              </span>
            </div>
          </div>
        </nav>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <ExperimentBuilder
            experiment={editingExp}
            onSave={handleBuilderSave}
            onCancel={handleBuilderCancel}
          />
        </div>
      </div>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">

      {/* ── Top nav ── */}
      <nav className="border-b border-white/5 bg-slate-900/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                 style={{ background: 'linear-gradient(135deg, #7c3aed, #0891b2)' }}>🔬</div>
            <span className="font-semibold text-white">Virtual Science Lab</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
              Teacher
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400 hidden sm:block">{user?.full_name}</span>
            <button
              id="teacher-logout"
              onClick={logout}
              className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full flex-1 flex flex-col gap-8">

        {/* ── Welcome ── */}
        <div className="rounded-2xl p-6 relative overflow-hidden"
             style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #0c1445 50%, #041822 100%)' }}>
          <div className="absolute inset-0 opacity-20"
               style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, #0891b2 0%, transparent 60%)' }} />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Teacher Dashboard</h1>
              <p className="text-slate-400 text-sm mt-0.5">
                {user?.subject_code ? `Subject: ${user.subject_code}` : 'All subjects'}
              </p>
            </div>
            <div className="flex gap-3">
              <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-center min-w-[90px]">
                <p className="text-2xl font-bold text-white">{experiments.length}</p>
                <p className="text-xs text-slate-400">Experiments</p>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-center min-w-[90px]">
                <p className="text-2xl font-bold text-amber-400">{pendingCount}</p>
                <p className="text-xs text-slate-400">To Grade</p>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-center min-w-[90px]">
                <p className="text-2xl font-bold text-green-400">{gradedCount}</p>
                <p className="text-xs text-slate-400">Graded</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Tab navigation ── */}
        <div className="flex items-center gap-4 border-b border-white/5 pb-1">
          <button
            onClick={() => setActiveTab('experiments')}
            className={`text-sm font-medium pb-2 transition-colors border-b-2 ${
              activeTab === 'experiments'
                ? 'border-violet-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            🧪 My Experiments
          </button>
          <button
            onClick={() => setActiveTab('submissions')}
            className={`text-sm font-medium pb-2 transition-colors border-b-2 ${
              activeTab === 'submissions'
                ? 'border-violet-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            📋 Submissions
          </button>
        </div>

        {/* ──────────────────────────────────────────────────────────────── */}
        {/*  Experiments Tab                                                */}
        {/* ──────────────────────────────────────────────────────────────── */}
        {activeTab === 'experiments' && (
          <div className="space-y-4">
            {/* Status filters + Create button */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex gap-2 flex-wrap">
                {(['all', 'draft', 'published', 'archived'] as StatusFilter[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-colors capitalize ${
                      statusFilter === f
                        ? 'border-violet-500/50 bg-violet-500/20 text-violet-300'
                        : 'border-white/10 text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {f === 'all' ? `All (${experiments.length})` : `${f} (${experiments.filter(e => e.status === f).length})`}
                  </button>
                ))}
              </div>
              <button
                onClick={handleCreateExperiment}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)', boxShadow: '0 4px 15px rgba(124,58,237,0.3)' }}
              >
                + Create Experiment
              </button>
            </div>

            {/* Experiments grid */}
            {loadingExp ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 rounded-full border-4 border-violet-500/20 border-t-violet-500 animate-spin mx-auto mb-3" />
                <p className="text-slate-400 text-sm">Loading experiments…</p>
              </div>
            ) : filteredExps.length === 0 ? (
              <div className="rounded-xl border border-white/5 bg-slate-900 p-12 text-center">
                <p className="text-4xl mb-3">🧪</p>
                <p className="text-slate-400 text-sm">No experiments found.</p>
                <button onClick={handleCreateExperiment} className="mt-4 text-sm text-violet-400 hover:text-violet-300">
                  Create your first experiment →
                </button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredExps.map(exp => {
                  const statusBadge = EXP_STATUS_BADGE[exp.status] ?? EXP_STATUS_BADGE.draft
                  return (
                    <div key={exp.id} className="rounded-xl border border-white/10 bg-slate-900 overflow-hidden hover:border-white/20 transition-colors">
                      {/* Card header */}
                      <div className="px-4 py-3 border-b border-white/5">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${SUBJECT_BADGE[exp.subject] ?? ''}`}>
                            {exp.subject}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusBadge.cls}`}>
                            {statusBadge.label}
                          </span>
                        </div>
                        <h3 className="text-sm font-semibold text-white leading-snug">{exp.title}</h3>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{exp.description}</p>
                      </div>
                      {/* Card meta */}
                      <div className="px-4 py-2 flex items-center gap-2 text-xs text-slate-500">
                        <span>{exp.difficulty}</span>
                        <span>·</span>
                        <span>{exp.simulation_type?.replace('_', ' ') ?? 'generic'}</span>
                        {exp.topic && <><span>·</span><span>{exp.topic}</span></>}
                      </div>
                      {/* Card actions */}
                      <div className="px-4 py-3 border-t border-white/5 flex flex-wrap gap-2">
                        <button
                          onClick={() => handleEditExperiment(exp)}
                          className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 transition-colors"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => loadSubmissions(exp)}
                          className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 transition-colors"
                        >
                          📋 Submissions
                        </button>
                        {exp.status === 'draft' && (
                          <button
                            onClick={() => handleStatusChange(exp, 'published')}
                            className="text-xs px-3 py-1.5 rounded-lg border border-green-500/30 text-green-400 hover:bg-green-500/10 transition-colors"
                          >
                            ✅ Publish
                          </button>
                        )}
                        {exp.status === 'published' && (
                          <button
                            onClick={() => handleStatusChange(exp, 'archived')}
                            className="text-xs px-3 py-1.5 rounded-lg border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-colors"
                          >
                            📦 Archive
                          </button>
                        )}
                        {exp.status === 'archived' && (
                          <button
                            onClick={() => handleStatusChange(exp, 'draft')}
                            className="text-xs px-3 py-1.5 rounded-lg border border-slate-500/30 text-slate-400 hover:bg-slate-500/10 transition-colors"
                          >
                            ↩ Restore
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────────── */}
        {/*  Submissions Tab                                                */}
        {/* ──────────────────────────────────────────────────────────────── */}
        {activeTab === 'submissions' && (
          <div className="flex flex-col lg:flex-row gap-6 flex-1">

            {/* ── Experiments selector ── */}
            <div className="lg:w-80 xl:w-96 shrink-0">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Select Experiment
              </h2>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {experiments.filter(e => e.status === 'published').map((exp) => (
                  <button
                    key={exp.id}
                    id={`exp-${exp.id}`}
                    onClick={() => loadSubmissions(exp)}
                    className={`w-full text-left rounded-xl border p-4 transition-all ${
                      selectedExp?.id === exp.id
                        ? 'border-violet-500/50 bg-violet-500/10'
                        : 'border-white/5 bg-slate-900 hover:border-white/15 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${SUBJECT_BADGE[exp.subject] ?? ''}`}>
                        {exp.subject}
                      </span>
                      <span className="text-xs text-slate-500">{exp.difficulty}</span>
                    </div>
                    <p className="text-sm font-medium text-white leading-snug">{exp.title}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Submissions grading panel ── */}
            <div className="flex-1 min-w-0">
              {!selectedExp ? (
                <div className="h-full flex items-center justify-center rounded-2xl border border-white/5 bg-slate-900">
                  <div className="text-center p-8">
                    <div className="text-4xl mb-3">📋</div>
                    <p className="text-slate-400 text-sm">Select an experiment to view student submissions</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-white">
                      Submissions — <span className="text-violet-300">{selectedExp.title}</span>
                    </h2>
                    {gradeMsg && (
                      <span className="text-xs text-green-400">{gradeMsg}</span>
                    )}
                  </div>

                  {loadingSubs ? (
                    <p className="text-slate-400 text-sm">Loading submissions…</p>
                  ) : submissions.length === 0 ? (
                    <div className="rounded-xl border border-white/5 bg-slate-900 p-8 text-center text-slate-500 text-sm">
                      No submissions yet for this experiment.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {submissions.map((sub) => {
                        const badge = SUB_STATUS_BADGE[sub.status]
                        const isGrading = gradingId === sub.id
                        return (
                          <div key={sub.id}
                               className="rounded-xl border border-white/10 bg-slate-900 overflow-hidden">
                            {/* Submission header */}
                            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-slate-700 text-slate-300">
                                  {String(sub.student_id).slice(-2)}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-white">Student #{sub.student_id}</p>
                                  <p className="text-xs text-slate-500">
                                    {sub.submitted_at
                                      ? new Date(sub.submitted_at).toLocaleString()
                                      : 'Not submitted'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${badge.cls}`}>
                                  {badge.label}
                                </span>
                                {sub.calculated_score !== null && (
                                  <span className={`text-xs font-mono font-semibold ${sub.calculated_score >= 70 ? 'text-green-400' : 'text-amber-400'}`}>
                                    {sub.calculated_score}/100
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Observations */}
                            {sub.recorded_observations && (
                              <div className="px-4 py-3 border-b border-white/5">
                                <p className="text-xs text-slate-500 mb-1 font-medium uppercase tracking-wide">Observations</p>
                                <pre className="text-xs text-slate-300 font-mono bg-slate-800 rounded-lg p-2 overflow-x-auto">
                                  {JSON.stringify(sub.recorded_observations, null, 2)}
                                </pre>
                              </div>
                            )}

                            {/* Existing feedback */}
                            {sub.teacher_feedback && !isGrading && (
                              <div className="px-4 py-2 border-b border-white/5">
                                <p className="text-xs text-slate-500 mb-0.5">Feedback</p>
                                <p className="text-xs text-slate-300">{sub.teacher_feedback}</p>
                              </div>
                            )}

                            {/* Grade inline form */}
                            {isGrading ? (
                              <div className="px-4 py-3 space-y-3">
                                <div>
                                  <label className="text-xs text-slate-400 mb-1 block">Feedback</label>
                                  <textarea
                                    id={`feedback-${sub.id}`}
                                    rows={2}
                                    value={feedback}
                                    onChange={(e) => setFeedback(e.target.value)}
                                    placeholder="Write feedback for this student…"
                                    className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-violet-500 resize-none"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-slate-400 mb-1 block">
                                    Override Score (0–100, optional)
                                  </label>
                                  <input
                                    id={`score-${sub.id}`}
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={scoreInput}
                                    onChange={(e) => setScoreInput(e.target.value)}
                                    placeholder={`Auto: ${sub.calculated_score ?? '—'}`}
                                    className="w-32 rounded-lg border border-white/10 bg-slate-800 px-3 py-1.5 text-sm text-white placeholder-slate-600 outline-none focus:border-violet-500"
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    id={`save-grade-${sub.id}`}
                                    onClick={() => handleGrade(sub.id)}
                                    disabled={grading}
                                    className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-60"
                                    style={{ background: 'linear-gradient(135deg, #16a34a, #0e7490)' }}
                                  >
                                    {grading ? 'Saving…' : 'Save Grade'}
                                  </button>
                                  <button
                                    id={`cancel-grade-${sub.id}`}
                                    onClick={() => { setGradingId(null); setFeedback(''); setScoreInput('') }}
                                    className="px-4 py-1.5 rounded-lg text-xs border border-white/10 text-slate-300 hover:bg-white/5 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="px-4 py-2 flex justify-end">
                                {sub.status !== 'draft' && (
                                  <button
                                    id={`grade-btn-${sub.id}`}
                                    onClick={() => {
                                      setGradingId(sub.id)
                                      setFeedback(sub.teacher_feedback ?? '')
                                      setScoreInput(sub.calculated_score?.toString() ?? '')
                                    }}
                                    className="text-xs px-3 py-1.5 rounded-lg border border-violet-500/30 text-violet-300 hover:bg-violet-500/10 transition-colors"
                                  >
                                    {sub.status === 'graded' ? '✏️ Edit Grade' : '📝 Grade'}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
