import React, { useState, useEffect } from 'react'
import {
  fetchStudentPerformanceAnalytics,
  fetchTeacherPerformanceAnalytics,
  type StudentPerformanceResponse,
  type StudentPerformanceRecord
} from '@/services/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TrendingUp, TrendingDown, Minus, Loader2, AlertCircle, Award, Target, BookOpen } from 'lucide-react'
import StudentPerformanceDrawer from './StudentPerformanceDrawer'

interface AnalyticsDashboardProps {
  isTeacher?: boolean;
  teacherClassLevel?: string | null;
}

export default function AnalyticsDashboard({ isTeacher, teacherClassLevel }: AnalyticsDashboardProps) {
  const [data, setData] = useState<StudentPerformanceResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [classLevel, setClassLevel] = useState<string>('All Levels')
  const [subject, setSubject] = useState<string>('All Subjects')
  const [period, setPeriod] = useState<string>('All Time')
  const [sort, setSort] = useState<string>('highest')
  
  // Drawer
  const [selectedStudent, setSelectedStudent] = useState<StudentPerformanceRecord | null>(null)

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      let result;
      if (isTeacher) {
        result = await fetchTeacherPerformanceAnalytics({
          subject: subject === 'All Subjects' ? undefined : subject,
          period: period === 'All Time' ? undefined : period,
          sort: sort,
          page: 1,
          page_size: 50 // Keep simple for now
        })
      } else {
        result = await fetchStudentPerformanceAnalytics({
          class_level: classLevel === 'All Levels' ? undefined : classLevel,
          subject: subject === 'All Subjects' ? undefined : subject,
          period: period === 'All Time' ? undefined : period,
          sort: sort,
          page: 1,
          page_size: 50
        })
      }
      setData(result)
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [classLevel, subject, period, sort, isTeacher])

  const getPerformanceBadge = (perf: string) => {
    switch (perf) {
      case 'Strong':
        return <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-xs font-medium">Strong</span>
      case 'Needs Attention':
        return <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs font-medium">Needs Attention</span>
      case 'At Risk':
        return <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 rounded-full text-xs font-medium">At Risk</span>
      default:
        return <span className="px-2.5 py-0.5 bg-slate-100 text-slate-800 rounded-full text-xs font-medium">No Data</span>
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case '↑': return <TrendingUp className="w-4 h-4 text-emerald-500" />
      case '↓': return <TrendingDown className="w-4 h-4 text-rose-500" />
      default: return <Minus className="w-4 h-4 text-slate-400" />
    }
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Award className="w-12 h-12" /></div>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-slate-500 mb-1">Average Score</p>
            <div className="text-3xl font-bold text-slate-800">
              {data?.summary.average_score !== null && data?.summary.average_score !== undefined 
                ? `${data.summary.average_score.toFixed(1)}%` 
                : 'N/A'}
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-slate-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><BookOpen className="w-12 h-12" /></div>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-slate-500 mb-1">Assessed Students</p>
            <div className="text-3xl font-bold text-slate-800">
              {data?.summary.assessed_students || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Target className="w-12 h-12" /></div>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-slate-500 mb-1">Strong Performance</p>
            <div className="text-3xl font-bold text-emerald-600">
              {data?.summary.strong_performance || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><AlertCircle className="w-12 h-12" /></div>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-slate-500 mb-1">Needs Attention / At Risk</p>
            <div className="text-3xl font-bold text-amber-600">
              {(data?.summary.needs_attention || 0) + (data?.summary.at_risk || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        {isTeacher ? (
          <div className="bg-indigo-50 border border-indigo-100 text-sm rounded-lg px-4 py-2 text-indigo-700 font-medium">
            Assigned Class: {teacherClassLevel || 'None'}
          </div>
        ) : (
          <select 
            className="bg-slate-50 border border-slate-200 text-sm rounded-lg px-3 py-2 text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
            value={classLevel} onChange={e => setClassLevel(e.target.value)}
          >
            <option>All Levels</option>
            <option>Form3</option>
            <option>Form4</option>
            <option>L6</option>
            <option>Upper 6</option>
          </select>
        )}

        <select 
          className="bg-slate-50 border border-slate-200 text-sm rounded-lg px-3 py-2 text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
          value={subject} onChange={e => setSubject(e.target.value)}
        >
          <option>All Subjects</option>
          <option>Physics</option>
          <option>Chemistry</option>
          <option>Biology</option>
        </select>

        <select 
          className="bg-slate-50 border border-slate-200 text-sm rounded-lg px-3 py-2 text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
          value={period} onChange={e => setPeriod(e.target.value)}
        >
          <option>All Time</option>
          <option>Last 30 Days</option>
        </select>

        <select 
          className="bg-slate-50 border border-slate-200 text-sm rounded-lg px-3 py-2 text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 ml-auto"
          value={sort} onChange={e => setSort(e.target.value)}
        >
          <option value="highest">Highest Performance</option>
          <option value="lowest">Lowest Performance</option>
          <option value="lowest_completion">Lowest Completion</option>
        </select>
      </div>

      {/* Main Table */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Level</th>
                <th className="px-6 py-4 text-right">Average Score</th>
                <th className="px-6 py-4 text-right">Completed</th>
                <th className="px-6 py-4">Performance</th>
                <th className="px-6 py-4 text-center">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading performance data...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-rose-500 bg-rose-50/50">
                    <AlertCircle className="w-6 h-6 mx-auto mb-2" />
                    {error}
                  </td>
                </tr>
              ) : data?.students.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No student performance data matches the selected filters.
                  </td>
                </tr>
              ) : (
                data?.students.map(student => (
                  <tr 
                    key={student.student_id} 
                    onClick={() => setSelectedStudent(student)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800">{student.name}</div>
                      <div className="text-xs text-slate-400">{student.email}</div>
                    </td>
                    <td className="px-6 py-4">{student.class_level || 'N/A'}</td>
                    <td className="px-6 py-4 text-right font-medium">
                      {student.average_score !== null ? `${student.average_score.toFixed(1)}%` : '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {student.completed} / {student.available}
                    </td>
                    <td className="px-6 py-4">
                      {getPerformanceBadge(student.performance)}
                    </td>
                    <td className="px-6 py-4 text-center flex justify-center items-center">
                      {getTrendIcon(student.trend)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Summary Panels */}
      {!loading && data && data.students.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <Card className="border-emerald-100 bg-emerald-50/30">
            <CardContent className="p-5">
              <h3 className="font-semibold text-emerald-800 mb-3 flex items-center gap-2">
                <Award className="w-5 h-5" /> Top Performers
              </h3>
              <div className="space-y-3">
                {data.students.filter(s => s.performance === 'Strong').slice(0, 5).map(s => (
                  <div key={s.student_id} className="flex justify-between items-center text-sm">
                    <span className="font-medium text-slate-700">{s.name} <span className="text-slate-400 text-xs ml-1">({s.class_level})</span></span>
                    <span className="font-bold text-emerald-600">{s.average_score?.toFixed(1)}%</span>
                  </div>
                ))}
                {data.students.filter(s => s.performance === 'Strong').length === 0 && (
                  <span className="text-sm text-slate-500">No students currently in the strong bracket.</span>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-rose-100 bg-rose-50/30">
            <CardContent className="p-5">
              <h3 className="font-semibold text-rose-800 mb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" /> Needs Attention
              </h3>
              <div className="space-y-3">
                {data.students.filter(s => s.performance === 'Needs Attention' || s.performance === 'At Risk').slice(0, 5).map(s => (
                  <div key={s.student_id} className="flex justify-between items-center text-sm">
                    <span className="font-medium text-slate-700">{s.name} <span className="text-slate-400 text-xs ml-1">({s.class_level})</span></span>
                    <span className="font-bold text-rose-600">{s.average_score?.toFixed(1)}%</span>
                  </div>
                ))}
                {data.students.filter(s => s.performance === 'Needs Attention' || s.performance === 'At Risk').length === 0 && (
                  <span className="text-sm text-slate-500">No students currently need attention.</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Drawer */}
      <StudentPerformanceDrawer 
        student={selectedStudent} 
        onClose={() => setSelectedStudent(null)} 
      />
    </div>
  )
}
