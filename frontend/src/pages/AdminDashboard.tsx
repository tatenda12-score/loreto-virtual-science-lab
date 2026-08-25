import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  fetchAdminStats,
  fetchUsers,
  createTeacher,
  updateUser,
  fetchExperiments,
  fetchSubmissionsForExperiment,
  createExperiment,
  updateExperiment,
  deleteExperiment,
  type UserProfile,
  type AdminStats,
  type Experiment,
  type Submission
} from '@/services/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Users,
  GraduationCap,
  FlaskConical,
  FileText,
  Settings,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Archive,
  Edit2
} from 'lucide-react'
import ExperimentBuilder from '@/components/experiments/ExperimentBuilder'

type TabType = 'overview' | 'teachers' | 'students' | 'experiments' | 'submissions'

const SUBJECT_BADGE: Record<string, string> = {
  Physics:   'bg-violet-500/20 text-violet-300 border-violet-500/30',
  Chemistry: 'bg-cyan-500/20   text-cyan-300   border-cyan-500/30',
  Biology:   'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  draft:     { label: 'Draft',     cls: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
  published: { label: 'Published', cls: 'bg-green-500/20 text-green-300 border-green-500/30' },
  archived:  { label: 'Archived',  cls: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
}

export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<TabType>('overview')

  // Stats State
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)

  // Teachers State
  const [teachers, setTeachers] = useState<UserProfile[]>([])
  const [loadingTeachers, setLoadingTeachers] = useState(false)
  const [showCreateTeacher, setShowCreateTeacher] = useState(false)
  const [newTeacher, setNewTeacher] = useState({ full_name: '', email: '', password: '', subject_code: '', gender: '' })

  // Students State
  const [students, setStudents] = useState<UserProfile[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)

  // Experiments State
  const [experiments, setExperiments] = useState<Experiment[]>([])
  const [loadingExperiments, setLoadingExperiments] = useState(false)
  const [expFilter, setExpFilter] = useState<'All' | 'Draft' | 'Published' | 'Archived'>('All')
  const [editingExp, setEditingExp] = useState<Experiment | undefined>(undefined)
  const [showExpBuilder, setShowExpBuilder] = useState(false)

  // Submissions State
  const [selectedExpId, setSelectedExpId] = useState<number | ''>('')
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loadingSubmissions, setLoadingSubmissions] = useState(false)

  // Auth Guard
  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/' + user.role, { replace: true })
    }
  }, [user, navigate])

  // Initial Load based on tab
  useEffect(() => {
    if (activeTab === 'overview' && !stats) loadStats()
    else if (activeTab === 'teachers' && teachers.length === 0) loadTeachers()
    else if (activeTab === 'students' && students.length === 0) loadStudents()
    else if (activeTab === 'experiments' && experiments.length === 0) loadExperiments()
  }, [activeTab])

  // --- API Loaders ---
  async function loadStats() {
    setLoadingStats(true)
    try {
      const data = await fetchAdminStats()
      setStats(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingStats(false)
    }
  }

  async function loadTeachers() {
    setLoadingTeachers(true)
    try {
      const data = await fetchUsers({ role: 'teacher' })
      setTeachers(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingTeachers(false)
    }
  }

  async function loadStudents() {
    setLoadingStudents(true)
    try {
      const data = await fetchUsers({ role: 'student' })
      setStudents(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingStudents(false)
    }
  }

  async function loadExperiments() {
    setLoadingExperiments(true)
    try {
      const data = await fetchExperiments()
      setExperiments(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingExperiments(false)
    }
  }

  // --- Handlers ---
  async function handleToggleUserStatus(userId: number, currentStatus: boolean, role: 'teacher'|'student') {
    if (!confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} this user?`)) return
    try {
      const updated = await updateUser(userId, { is_active: !currentStatus })
      if (role === 'teacher') {
        setTeachers(prev => prev.map(t => t.id === userId ? updated : t))
      } else {
        setStudents(prev => prev.map(s => s.id === userId ? updated : s))
      }
    } catch (e) {
      alert('Failed to update user status.')
    }
  }

  async function handleCreateTeacher(e: React.FormEvent) {
    e.preventDefault()
    try {
      const created = await createTeacher(newTeacher)
      setTeachers([created, ...teachers])
      setShowCreateTeacher(false)
      setNewTeacher({ full_name: '', email: '', password: '', subject_code: '', gender: '' })
    } catch (e) {
      alert('Failed to create teacher.')
    }
  }

  function handleSaveExperiment(savedExp: Experiment) {
    setExperiments(prev => {
      const exists = prev.some(e => e.id === savedExp.id)
      if (exists) {
        return prev.map(e => e.id === savedExp.id ? savedExp : e)
      }
      return [savedExp, ...prev]
    })
    setShowExpBuilder(false)
    setEditingExp(undefined)
  }

  async function handleExpStatusChange(id: number, newStatus: 'draft' | 'published' | 'archived') {
    try {
      const updated = await updateExperiment(id, { status: newStatus })
      setExperiments(prev => prev.map(e => e.id === updated.id ? updated : e))
    } catch (e) {
      alert('Failed to update experiment status.')
    }
  }

  async function handleExpSelectForSubs(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value
    setSelectedExpId(val === '' ? '' : parseInt(val))
    if (val !== '') {
      setLoadingSubmissions(true)
      try {
        const data = await fetchSubmissionsForExperiment(parseInt(val))
        setSubmissions(data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoadingSubmissions(false)
      }
    } else {
      setSubmissions([])
    }
  }

  // --- Render Helpers ---
  const renderOverview = () => {
    if (loadingStats) return <div className="text-slate-400">Loading stats...</div>
    if (!stats) return <div className="text-red-400">Failed to load stats.</div>

    const statCards = [
      { label: 'Total Students', value: stats.total_students, icon: <GraduationCap className="w-5 h-5 text-violet-400" /> },
      { label: 'Total Teachers', value: stats.total_teachers, icon: <Users className="w-5 h-5 text-cyan-400" /> },
      { label: 'Total Experiments', value: stats.total_experiments, icon: <FlaskConical className="w-5 h-5 text-emerald-400" /> },
      { label: 'Published Exp.', value: stats.published_experiments, icon: <CheckCircle2 className="w-5 h-5 text-green-400" /> },
      { label: 'Total Submissions', value: stats.total_submissions, icon: <FileText className="w-5 h-5 text-amber-400" /> },
      { label: 'Pending Grading', value: stats.pending_submissions, icon: <Settings className="w-5 h-5 text-rose-400" /> },
    ]

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((s, i) => (
          <Card key={i} className="bg-white/5 border-white/10 text-white backdrop-blur-sm">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 font-medium">{s.label}</p>
                <p className="text-3xl font-bold mt-2">{s.value}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-white/5">
                {s.icon}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const renderTeachers = () => {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Manage Teachers</h2>
          <Button onClick={() => setShowCreateTeacher(!showCreateTeacher)} className="gap-2">
            <Plus className="w-4 h-4" /> Create Teacher
          </Button>
        </div>

        {showCreateTeacher && (
          <Card className="bg-slate-900 border-white/10">
            <CardHeader>
              <CardTitle className="text-lg">Add New Teacher</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateTeacher} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input required placeholder="Full Name" className="bg-slate-950 border border-white/10 rounded-lg px-4 py-2 text-white" value={newTeacher.full_name} onChange={e => setNewTeacher({...newTeacher, full_name: e.target.value})} />
                <input required type="email" placeholder="Email" className="bg-slate-950 border border-white/10 rounded-lg px-4 py-2 text-white" value={newTeacher.email} onChange={e => setNewTeacher({...newTeacher, email: e.target.value})} />
                <input required type="password" placeholder="Password" className="bg-slate-950 border border-white/10 rounded-lg px-4 py-2 text-white" value={newTeacher.password} onChange={e => setNewTeacher({...newTeacher, password: e.target.value})} />
                <input required placeholder="Subject Code" className="bg-slate-950 border border-white/10 rounded-lg px-4 py-2 text-white" value={newTeacher.subject_code} onChange={e => setNewTeacher({...newTeacher, subject_code: e.target.value})} />
                <select required className="bg-slate-950 border border-white/10 rounded-lg px-4 py-2 text-white" value={newTeacher.gender} onChange={e => setNewTeacher({...newTeacher, gender: e.target.value})}>
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
                <div className="flex justify-end gap-3 sm:col-span-2">
                  <Button type="button" variant="ghost" onClick={() => setShowCreateTeacher(false)}>Cancel</Button>
                  <Button type="submit">Save Teacher</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {loadingTeachers ? <p className="text-slate-400">Loading teachers...</p> : (
          <div className="grid gap-4">
            {teachers.length === 0 ? <p className="text-slate-500">No teachers found.</p> : teachers.map(t => (
              <div key={t.id} className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
                <div>
                  <p className="font-semibold">{t.full_name}</p>
                  <p className="text-sm text-slate-400">{t.email} &bull; {t.subject_code}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-xs px-2 py-1 rounded-full border ${t.is_active ? 'bg-green-500/20 text-green-300 border-green-500/30' : 'bg-red-500/20 text-red-300 border-red-500/30'}`}>
                    {t.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => handleToggleUserStatus(t.id, t.is_active, 'teacher')}>
                    {t.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const renderStudents = () => {
    return (
      <div className="space-y-6">
        <h2 className="text-lg font-semibold">Manage Students</h2>
        {loadingStudents ? <p className="text-slate-400">Loading students...</p> : (
          <div className="grid gap-4">
            {students.length === 0 ? <p className="text-slate-500">No students found.</p> : students.map(s => (
              <div key={s.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm gap-4">
                <div>
                  <p className="font-semibold">{s.full_name}</p>
                  <p className="text-sm text-slate-400">{s.email} &bull; Class: {s.class_level || 'N/A'}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-xs px-2 py-1 rounded-full border ${s.is_active ? 'bg-green-500/20 text-green-300 border-green-500/30' : 'bg-red-500/20 text-red-300 border-red-500/30'}`}>
                    {s.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => handleToggleUserStatus(s.id, s.is_active, 'student')}>
                    {s.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const renderExperiments = () => {
    if (showExpBuilder) {
      return (
        <ExperimentBuilder
          experiment={editingExp}
          onSave={handleSaveExperiment}
          onCancel={() => { setShowExpBuilder(false); setEditingExp(undefined); }}
        />
      )
    }

    const filtered = experiments.filter(e => expFilter === 'All' || e.status.toLowerCase() === expFilter.toLowerCase())

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex gap-2 p-1 bg-slate-900 rounded-lg border border-white/10">
            {['All', 'Draft', 'Published', 'Archived'].map(f => (
              <button
                key={f}
                onClick={() => setExpFilter(f as any)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${expFilter === f ? 'bg-white/10 text-white font-medium' : 'text-slate-400 hover:text-slate-300'}`}
              >
                {f}
              </button>
            ))}
          </div>
          <Button onClick={() => { setEditingExp(undefined); setShowExpBuilder(true) }} className="gap-2">
            <Plus className="w-4 h-4" /> Create Experiment
          </Button>
        </div>

        {loadingExperiments ? <p className="text-slate-400">Loading experiments...</p> : (
          <div className="grid gap-4">
            {filtered.length === 0 ? <p className="text-slate-500">No experiments found.</p> : filtered.map(exp => (
              <div key={exp.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${SUBJECT_BADGE[exp.subject] ?? ''}`}>
                      {exp.subject}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_BADGE[exp.status]?.cls ?? ''}`}>
                      {STATUS_BADGE[exp.status]?.label ?? exp.status}
                    </span>
                    <span className="text-xs text-slate-500">{exp.difficulty}</span>
                  </div>
                  <p className="font-semibold">{exp.title}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => { setEditingExp(exp); setShowExpBuilder(true) }}>
                    <Edit2 className="w-4 h-4 mr-2" /> Edit
                  </Button>
                  {exp.status === 'draft' && (
                    <Button variant="outline" size="sm" onClick={() => handleExpStatusChange(exp.id, 'published')} className="text-green-400 hover:text-green-300 hover:bg-green-500/10">
                      Publish
                    </Button>
                  )}
                  {exp.status === 'published' && (
                    <Button variant="outline" size="sm" onClick={() => handleExpStatusChange(exp.id, 'archived')} className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10">
                      Archive
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const renderSubmissions = () => {
    return (
      <div className="space-y-6">
        <div className="max-w-md">
          <label className="block text-sm font-medium text-slate-300 mb-2">Select Experiment</label>
          <select
            className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-violet-500"
            value={selectedExpId}
            onChange={handleExpSelectForSubs}
          >
            <option value="">-- Choose an experiment --</option>
            {experiments.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
          </select>
        </div>

        {selectedExpId !== '' && (
          <div className="space-y-4 mt-6">
            <h3 className="text-lg font-semibold">Submissions</h3>
            {loadingSubmissions ? <p className="text-slate-400">Loading submissions...</p> : (
              submissions.length === 0 ? <p className="text-slate-500">No submissions for this experiment yet.</p> : (
                <div className="grid gap-4">
                  {submissions.map(sub => (
                    <div key={sub.id} className="rounded-xl border border-white/10 bg-slate-900 p-4">
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold">
                             {String(sub.student_id).slice(-2)}
                           </div>
                           <div>
                             <p className="font-medium text-sm">Student #{sub.student_id}</p>
                             <p className="text-xs text-slate-400">{sub.submitted_at ? new Date(sub.submitted_at).toLocaleString() : 'N/A'}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-2">
                           <span className="text-xs px-2 py-1 rounded-full border bg-slate-800 border-slate-600 text-slate-300">
                             Status: {sub.status}
                           </span>
                           {sub.calculated_score !== null && (
                             <span className={`text-sm font-mono font-bold ${sub.calculated_score >= 70 ? 'text-green-400' : 'text-amber-400'}`}>
                               {sub.calculated_score}/100
                             </span>
                           )}
                        </div>
                      </div>
                      
                      {sub.recorded_observations && (
                        <div className="mb-3">
                          <p className="text-xs text-slate-500 uppercase font-medium mb-1">Observations</p>
                          <pre className="text-xs font-mono bg-slate-950 p-2 rounded-lg border border-white/5 overflow-x-auto text-slate-300">
                            {JSON.stringify(sub.recorded_observations, null, 2)}
                          </pre>
                        </div>
                      )}

                      {sub.teacher_feedback && (
                        <div>
                          <p className="text-xs text-slate-500 uppercase font-medium mb-1">Teacher Feedback</p>
                          <p className="text-sm text-slate-300 bg-slate-800/50 p-2 rounded-lg border border-white/5">{sub.teacher_feedback}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* --- Top Nav --- */}
      <nav className="border-b border-white/5 bg-slate-900/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                 style={{ background: 'linear-gradient(135deg, #7c3aed, #0891b2)' }}>🔬</div>
            <span className="font-semibold text-white">Virtual Science Lab</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400 hidden sm:block">{user?.full_name}</span>
            <button
              onClick={logout}
              className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full flex-1 flex flex-col">
        {/* --- Header & Tabs --- */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-6">Admin Dashboard</h1>
          
          <div className="flex overflow-x-auto pb-2 -mb-2 scrollbar-hide gap-2 border-b border-white/10">
            {(['overview', 'teachers', 'students', 'experiments', 'submissions'] as TabType[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-violet-500 text-violet-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-white/20'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* --- Tab Content --- */}
        <div className="flex-1">
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'teachers' && renderTeachers()}
          {activeTab === 'students' && renderStudents()}
          {activeTab === 'experiments' && renderExperiments()}
          {activeTab === 'submissions' && renderSubmissions()}
        </div>
      </div>
    </div>
  )
}
