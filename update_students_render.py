import os

filepath = 'frontend/src/pages/AdminDashboard.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add state
content = content.replace(
    "  const [loadingStudents, setLoadingStudents] = useState(false)",
    "  const [loadingStudents, setLoadingStudents] = useState(false)\n  const [studentClassFilter, setStudentClassFilter] = useState<'All' | 'Form3' | 'Form4' | 'L6' | 'Upper6' | 'Unassigned'>('All')"
)

# 2. Update renderStudents
old_render = '''  const renderStudents = () => {
    return (
      <div className="space-y-6">
        <h2 className="text-lg font-semibold">Manage Students</h2>
        {loadingStudents ? <p className="text-slate-400">Loading students...</p> : (
          <div className="grid gap-4">
            {students.length === 0 ? <p className="text-slate-500">No students found.</p> : students.map(s => (
              <div key={s.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-200 bg-white shadow-sm gap-4">
                <div>
                  <p className="font-semibold text-slate-900">{s.full_name}</p>
                  <p className="text-sm text-slate-500">{s.email} &bull; Class: {s.class_level || 'N/A'}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className={	ext-xs px-2 py-1 rounded-md border font-medium }>
                    {s.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => handleToggleUserStatus(s.id, s.is_active, 'student')} className="border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm">
                    {s.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }'''

new_render = '''  const renderStudents = () => {
    const filterOptions = ['All', 'Form3', 'Form4', 'L6', 'Upper6', 'Unassigned']
    
    const filteredStudents = students.filter(s => {
      if (studentClassFilter === 'All') return true
      if (studentClassFilter === 'Unassigned') return !s.class_level
      return s.class_level === studentClassFilter
    })

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-lg font-semibold">Manage Students</h2>
          <div className="flex gap-2 p-1 bg-slate-100 rounded-lg border border-slate-200 overflow-x-auto max-w-full">
            {filterOptions.map(f => {
              const count = f === 'All' 
                ? students.length 
                : f === 'Unassigned' 
                  ? students.filter(s => !s.class_level).length
                  : students.filter(s => s.class_level === f).length
                  
              return (
                <button
                  key={f}
                  onClick={() => setStudentClassFilter(f as any)}
                  className={px-3 py-1.5 text-sm rounded-md transition-colors whitespace-nowrap }
                >
                  {f === 'Unassigned' ? 'Unassigned' : f === 'All' ? 'All Classes' : f} ({count})
                </button>
              )
            })}
          </div>
        </div>
        
        {loadingStudents ? <p className="text-slate-400">Loading students...</p> : (
          <div className="grid gap-4">
            {filteredStudents.length === 0 ? <p className="text-slate-500">No students found in this class.</p> : filteredStudents.map(s => (
              <div key={s.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-200 bg-white shadow-sm gap-4">
                <div>
                  <p className="font-semibold text-slate-900">{s.full_name}</p>
                  <p className="text-sm text-slate-500">{s.email} &bull; Class: {s.class_level || 'Unassigned'}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className={	ext-xs px-2 py-1 rounded-md border font-medium }>
                    {s.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => handleToggleUserStatus(s.id, s.is_active, 'student')} className="border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm">
                    {s.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }'''
content = content.replace(old_render, new_render)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
