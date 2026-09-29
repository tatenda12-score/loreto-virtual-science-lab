import React, { useState, useEffect } from 'react'
import { fetchTeacherPerformanceAnalytics, type StudentPerformanceRecord } from '@/services/api'
import { AlertTriangle, TrendingDown } from 'lucide-react'

export default function NotoriousStudents() {
  const [students, setStudents] = useState<StudentPerformanceRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadNotorious = async () => {
      try {
        const res = await fetchTeacherPerformanceAnalytics({
          sort: 'lowest',
          page: 1,
          page_size: 100
        })
        
        // Filter those who need attention or have no completion
        const notorious = res.students.filter(s => 
          s.performance === 'At Risk' || 
          s.performance === 'Needs Attention' ||
          s.completion_rate === 0
        )
        setStudents(notorious)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadNotorious()
  }, [])

  if (loading) return <div className="text-slate-500 py-10 text-center animate-pulse">Loading students...</div>

  if (students.length === 0) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-8 text-center">
        <h3 className="text-emerald-800 font-bold text-lg mb-2">Great news!</h3>
        <p className="text-emerald-600 text-sm">You have no notorious students right now. Everyone is performing well.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-xl">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-rose-600" />
          <h2 className="text-lg font-bold text-rose-900">Notorious Students (Needs Attention)</h2>
        </div>
        <p className="text-sm text-rose-700 mt-1">
          The following students have not been submitting assignments, or are performing very poorly in assessments. Please check on them.
        </p>
      </div>

      <div className="grid gap-4 mt-6">
        {students.map(s => (
          <div key={s.student_id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="font-bold text-slate-800 text-lg">{s.name}</p>
              <p className="text-sm text-slate-500 mb-2">{s.email}</p>
              <div className="flex gap-2 text-xs">
                <span className={`px-2 py-1 rounded-md font-bold ${s.completion_rate === 0 ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'}`}>
                  Completed: {s.completed}/{s.available} ({Math.round(s.completion_rate * 100)}%)
                </span>
                <span className={`px-2 py-1 rounded-md font-bold ${s.performance === 'At Risk' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                  {s.performance}
                </span>
              </div>
            </div>
            
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 min-w-[200px]">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <TrendingDown className="w-3 h-3" /> Reason
              </p>
              <p className="text-sm font-semibold text-slate-700">
                {s.completion_rate === 0 
                  ? 'Has not submitted any experiments.' 
                  : s.performance === 'At Risk' 
                    ? `Failing with an average score of ${s.average_score?.toFixed(1) || 0}%.`
                    : `Underperforming with an average score of ${s.average_score?.toFixed(1) || 0}%.`}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
