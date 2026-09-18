import React from 'react'
import type {
  StudentPerformanceRecord,
  ExperimentPerformance
} from '@/services/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { X, User, Activity, AlertCircle, TrendingUp, TrendingDown, Minus, CheckCircle2 } from 'lucide-react'

interface DrawerProps {
  student: StudentPerformanceRecord | null
  onClose: () => void
}

export default function StudentPerformanceDrawer({ student, onClose }: DrawerProps) {
  if (!student) return null

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case '↑': return <TrendingUp className="w-5 h-5 text-emerald-500" />
      case '↓': return <TrendingDown className="w-5 h-5 text-rose-500" />
      default: return <Minus className="w-5 h-5 text-slate-400" />
    }
  }

  const getPerformanceBadge = (perf: string) => {
    switch (perf) {
      case 'Strong':
        return <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm font-medium">Strong</span>
      case 'Needs Attention':
        return <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium">Needs Attention</span>
      case 'At Risk':
        return <span className="px-3 py-1 bg-rose-100 text-rose-800 rounded-full text-sm font-medium">At Risk</span>
      default:
        return <span className="px-3 py-1 bg-slate-100 text-slate-800 rounded-full text-sm font-medium">No Data</span>
    }
  }

  const getSubjectBadge = (subject: string) => {
    switch (subject) {
      case 'Physics': return 'bg-violet-50 text-violet-700 border-violet-200'
      case 'Chemistry': return 'bg-cyan-50 text-cyan-700 border-cyan-200'
      case 'Biology': return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      default: return 'bg-slate-50 text-slate-700 border-slate-200'
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col slide-in-from-right-full duration-300">
        
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-800">{student.name}</h2>
              <p className="text-sm text-slate-500">{student.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5 text-slate-500" />
          </Button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="border-slate-100 shadow-sm">
              <CardContent className="p-4 flex flex-col gap-1">
                <span className="text-sm font-medium text-slate-500">Average Score</span>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-bold text-slate-800">
                    {student.average_score !== null ? `${student.average_score.toFixed(1)}%` : 'N/A'}
                  </span>
                  {getTrendIcon(student.trend)}
                </div>
              </CardContent>
            </Card>
            <Card className="border-slate-100 shadow-sm">
              <CardContent className="p-4 flex flex-col gap-1">
                <span className="text-sm font-medium text-slate-500">Completion</span>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-bold text-slate-800">
                    {student.completed}/{student.available}
                  </span>
                  <span className="text-sm text-slate-500 mb-1">({student.completion_rate.toFixed(0)}%)</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-sm font-medium text-slate-600">Overall Assessment</span>
            {getPerformanceBadge(student.performance)}
          </div>

          {/* Experiments List */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-slate-800 flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-500" />
              Experiment History
            </h3>
            
            {student.experiments.length === 0 ? (
              <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-lg border border-slate-100 border-dashed">
                No experiments completed yet.
              </div>
            ) : (
              <div className="space-y-3">
                {student.experiments.map((exp) => (
                  <div key={exp.experiment_id} className="p-4 rounded-lg border border-slate-200 bg-white shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div className="space-y-1">
                        <h4 className="font-medium text-slate-800 line-clamp-1">{exp.title}</h4>
                        <span className={`inline-block px-2 py-0.5 rounded text-xs border ${getSubjectBadge(exp.subject)}`}>
                          {exp.subject}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className={`text-lg font-bold ${exp.score >= 75 ? 'text-emerald-600' : exp.score >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>
                          {exp.score.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500 mt-3 pt-3 border-t border-slate-50">
                      <span className="flex items-center gap-1">
                        {exp.status === 'graded' ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <AlertCircle className="w-3 h-3 text-amber-500" />}
                        {exp.status === 'graded' ? 'Graded' : 'Submitted'}
                      </span>
                      <span>
                        {exp.submitted_at ? new Date(exp.submitted_at).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
