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
  Physics:   'bg-violet-50 text-violet-700 border-violet-200',
  Chemistry: 'bg-cyan-50   text-cyan-700   border-cyan-200',
  Biology:   'bg-emerald-50 text-emerald-700 border-emerald-200',
}

const SUB_STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  draft:     { label: 'Draft',     cls: 'bg-slate-100 text-slate-700 border-slate-200' },
  submitted: { label: 'Pending',   cls: 'bg-amber-50  text-amber-700  border-amber-200' },
  graded:    { label: 'Graded',    cls: 'bg-green-50  text-green-700  border-green-200' },
}

const EXP_STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  draft:     { label: 'Draft',     cls: 'bg-slate-100 text-slate-700 border-slate-200' },
  published: { label: 'Published', cls: 'bg-green-50  text-green-700  border-green-200' },
  archived:  { label: 'Archived',  cls: 'bg-amber-50  text-amber-700  border-amber-200' },
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
    fetchExperiments()
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
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md flex items-center justify-center text-sm bg-slate-900 text-white">🔬</div>
              <span className="font-semibold text-slate-900">Virtual Science Lab</span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">

      {/* ── Top nav ── */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md flex items-center justify-center text-sm bg-slate-900 text-white">🔬</div>
            <span className="font-semibold text-slate-900">Virtual Science Lab</span>
            <span className="text-xs px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
              Teacher
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600 hidden sm:block">{user?.full_name}</span>
            <button
              id="teacher-logout"
              onClick={logout}
              className="text-xs px-3 py-1.5 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full flex-1 flex flex-col gap-8">

        {/* ── Welcome ── */}
        <div className="rounded-xl p-6 bg-white border border-slate-200 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div>
              <p className="text-slate-500 text-sm mb-1">Teacher Dashboard</p>
              <h1 className="text-2xl font-bold text-slate-900">{user?.full_name ?? 'Teacher'}</h1>
              <p className="text-slate-600 text-sm mt-0.5">
                {user?.subject_code ? `Subject: ${user.subject_code}` : 'All subjects'}
              </p>
            </div>
            <div className="flex gap-4">
              <div className="text-center min-w-[90px]">
                <p className="text-2xl font-bold text-slate-900">{experiments.length}</p>
                <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mt-0.5">Experiments</p>
              </div>
              <div className="text-center min-w-[90px]">
                <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
                <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mt-0.5">To Grade</p>
              </div>
              <div className="text-center min-w-[90px]">
                <p className="text-2xl font-bold text-green-600">{gradedCount}</p>
                <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mt-0.5">Graded</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Tab navigation ── */}
        <div className="flex items-center gap-6 border-b border-slate-200 pb-px">
          <button
            onClick={() => setActiveTab('experiments')}
            className={`text-sm font-semibold pb-3 transition-colors border-b-2 ${
              activeTab === 'experiments'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            🧪 My Experiments
          </button>
          <button
            onClick={() => setActiveTab('submissions')}
            className={`text-sm font-semibold pb-3 transition-colors border-b-2 ${
              activeTab === 'submissions'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
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
                    className={`text-xs px-3 py-1.5 rounded-md border transition-colors capitalize font-medium ${
                      statusFilter === f
                        ? 'border-blue-200 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    {f === 'all' ? `All (${experiments.length})` : `${f} (${experiments.filter(e => e.status === f).length})`}
                  </button>
                ))}
              </div>
              <button
                onClick={handleCreateExperiment}
                className="px-4 py-2 rounded-md text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors"
              >
                + Create Experiment
              </button>
            </div>

            {/* Experiments grid */}
            {loadingExp ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin mx-auto mb-3" />
                <p className="text-slate-500 text-sm">Loading experiments...</p>
              </div>
            ) : filteredExps.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                <p className="text-4xl mb-3">🧪</p>
                <p className="text-slate-500 text-sm">No experiments found.</p>
                <button onClick={handleCreateExperiment} className="mt-4 text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline">
                  Create your first experiment →
                </button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredExps.map(exp => {
                  const statusBadge = EXP_STATUS_BADGE[exp.status] ?? EXP_STATUS_BADGE.draft
                  return (
                    <div key={exp.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                      {/* Card header */}
                      <div className="px-4 py-3 border-b border-slate-100 flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs px-2 py-0.5 rounded-md border font-medium ${SUBJECT_BADGE[exp.subject] ?? ''}`}>
                            {exp.subject}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-md border font-medium ${statusBadge.cls}`}>
                            {statusBadge.label}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 leading-snug">{exp.title}</h3>
                        <p className="text-xs text-slate-600 mt-1 line-clamp-2">{exp.description}</p>
                      </div>
                      {/* Card meta */}
                      <div className="px-4 py-2 flex items-center gap-2 text-xs text-slate-500 font-medium">
                        <span>{exp.difficulty}</span>
                        <span>·</span>
                        <span>{exp.simulation_type?.replace('_', ' ') ?? 'generic'}</span>
                        {exp.topic && <><span>·</span><span>{exp.topic}</span></>}
                      </div>
                      {/* Card actions */}
                      <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex flex-wrap gap-2 mt-auto">
                        <button
                          onClick={() => handleEditExperiment(exp)}
                          className="text-xs font-semibold px-3 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => loadSubmissions(exp)}
                          className="text-xs font-semibold px-3 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
                        >
                          📋 Submissions
                        </button>
                        {exp.status === 'draft' && (
                          <button
                            onClick={() => handleStatusChange(exp, 'published')}
                            className="text-xs font-semibold px-3 py-1.5 rounded-md border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 shadow-sm transition-colors"
                          >
                            ✅ Publish
                          </button>
                        )}
                        {exp.status === 'published' && (
                          <button
                            onClick={() => handleStatusChange(exp, 'archived')}
                            className="text-xs font-semibold px-3 py-1.5 rounded-md border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 shadow-sm transition-colors"
                          >
                            📦 Archive
                          </button>
                        )}
                        {exp.status === 'archived' && (
                          <button
                            onClick={() => handleStatusChange(exp, 'draft')}
                            className="text-xs font-semibold px-3 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
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
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
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
                        ? 'border-blue-300 bg-blue-50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-md border font-medium ${SUBJECT_BADGE[exp.subject] ?? ''}`}>
                        {exp.subject}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">{exp.difficulty}</span>
                    </div>
                    <p className="text-sm font-bold text-slate-900 leading-snug">{exp.title}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Submissions grading panel ── */}
            <div className="flex-1 min-w-0">
              {!selectedExp ? (
                <div className="h-full flex items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="text-center p-8">
                    <div className="text-4xl mb-3">📋</div>
                    <p className="text-slate-500 text-sm font-medium">Select an experiment to view student submissions</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-slate-900">
                      Submissions — <span className="text-blue-600">{selectedExp.title}</span>
                    </h2>
                    {gradeMsg && (
                      <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-md">{gradeMsg}</span>
                    )}
                  </div>

                  {loadingSubs ? (
                    <p className="text-slate-500 text-sm">Loading submissions...</p>
                  ) : submissions.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500 text-sm shadow-sm">
                      No submissions yet for this experiment.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {submissions.map((sub) => {
                        const badge = SUB_STATUS_BADGE[sub.status]
                        const isGrading = gradingId === sub.id
                        return (
                          <div key={sub.id}
                               className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                            {/* Submission header */}
                            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-slate-200 text-slate-700">
                                  {String(sub.student_id).slice(-2)}
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-slate-900">Student #{sub.student_id}</p>
                                  <p className="text-xs text-slate-500 font-medium">
                                    {sub.submitted_at
                                      ? new Date(sub.submitted_at).toLocaleString()
                                      : 'Not submitted'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs px-2 py-0.5 rounded-md border font-medium ${badge.cls}`}>
                                  {badge.label}
                                </span>
                                {sub.final_score !== null && (
                                  <span className={`text-xs font-mono font-bold ${sub.final_score >= 70 ? 'text-green-600' : 'text-amber-600'}`}>
                                    {sub.final_score}/100
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Observations */}
                            {sub.recorded_observations && (
                              <div className="px-4 py-3 border-b border-slate-100">
                                <p className="text-xs text-slate-500 mb-1 font-bold uppercase tracking-wide">Observations</p>
                                <pre className="text-xs text-slate-700 font-mono bg-slate-50 border border-slate-200 rounded-md p-2 overflow-x-auto">
                                  {JSON.stringify(sub.recorded_observations, null, 2)}
                                </pre>
                              </div>
                            )}

                            {/* Existing feedback */}
                            {sub.teacher_feedback && !isGrading && (
                              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                                <p className="text-xs text-slate-500 mb-1 font-bold uppercase tracking-wide">Feedback</p>
                                <p className="text-sm text-slate-700">{sub.teacher_feedback}</p>
                              </div>
                            )}

                            {/* Grade inline form */}
                            {isGrading ? (
                              <div className="px-4 py-4 space-y-4 bg-blue-50/30">
                                <div>
                                  <label className="text-xs font-bold text-slate-700 mb-1.5 block uppercase tracking-wide">Feedback</label>
                                  <textarea
                                    id={`feedback-${sub.id}`}
                                    rows={2}
                                    value={feedback}
                                    onChange={(e) => setFeedback(e.target.value)}
                                    placeholder="Write feedback for this student..."
                                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none shadow-sm"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs font-bold text-slate-700 mb-1.5 block uppercase tracking-wide">
                                    Override Score (0–100, optional)
                                  </label>
                                  <input
                                    id={`score-${sub.id}`}
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={scoreInput}
                                    onChange={(e) => setScoreInput(e.target.value)}
                                    placeholder={`Auto: ${sub.automatic_score ?? '—'}`}
                                    className="w-32 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-sm"
                                  />
                                </div>
                                <div className="flex gap-3">
                                  <button
                                    id={`save-grade-${sub.id}`}
                                    onClick={() => handleGrade(sub.id)}
                                    disabled={grading}
                                    className="px-4 py-2 rounded-md text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-60"
                                  >
                                    {grading ? 'Saving...' : 'Save Grade'}
                                  </button>
                                  <button
                                    id={`cancel-grade-${sub.id}`}
                                    onClick={() => { setGradingId(null); setFeedback(''); setScoreInput('') }}
                                    className="px-4 py-2 rounded-md text-xs font-bold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="px-4 py-3 bg-white flex justify-end">
                                {sub.status !== 'draft' && (
                                  <button
                                    id={`grade-btn-${sub.id}`}
                                    onClick={() => {
                                      setGradingId(sub.id)
                                      setFeedback(sub.teacher_feedback ?? '')
                                      setScoreInput(sub.final_score?.toString() ?? '')
                                    }}
                                    className="text-xs font-semibold px-3 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
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
