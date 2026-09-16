import re

with open('src/pages/AdminDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

new = '''  const renderStudents = () => {
    const availableClasses = Array.from(new Set(students.map(s => s.class_level || 'Unknown'))).sort()
    
    const filteredStudents = studentClassFilter === 'All' 
      ? students 
      : students.filter(s => (s.class_level || 'Unknown') === studentClassFilter)

    return (
      <div className="space-y-6">
        <h2 className="text-lg font-semibold">Manage Students</h2>
        
        {/* Class Filter Buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Button 
            variant={studentClassFilter === 'All' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => setStudentClassFilter('All')}
            className={studentClassFilter === 'All' ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}
          >
            All Students ({students.length})
          </Button>
          {availableClasses.map(cls => {
            const count = students.filter(s => (s.class_level || 'Unknown') === cls).length;
            return (
              <Button 
                key={cls}
                variant={studentClassFilter === cls ? 'default' : 'outline'} 
                size="sm" 
                onClick={() => setStudentClassFilter(cls)}
                className={studentClassFilter === cls ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}
              >
                {cls} ({count})
              </Button>
            )
          })}
        </div>

        {loadingStudents ? <p className="text-slate-400">Loading students...</p> : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-slate-700">Name</th>
                    <th className="px-6 py-4 font-semibold text-slate-700">Email</th>
                    <th className="px-6 py-4 font-semibold text-slate-700">Class</th>
                    <th className="px-6 py-4 font-semibold text-slate-700 text-center">Status</th>
                    <th className="px-6 py-4 font-semibold text-slate-700 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No students found in this class.</td>
                    </tr>
                  ) : filteredStudents.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">{s.full_name}</td>
                      <td className="px-6 py-4 text-slate-500">{s.email}</td>
                      <td className="px-6 py-4 text-slate-500">{s.class_level || 'N/A'}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={	ext-xs px-2 py-1 rounded-md border font-medium inline-flex }>
                          {s.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="outline" size="sm" onClick={() => handleToggleUserStatus(s.id, s.is_active, 'student')} className="border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm">
                          {s.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    )
  }'''

content = re.sub(r'  const renderStudents = \(\) => \{.*?(?=  const renderExperiments = \(\) => \{)', new + '\n\n', content, flags=re.DOTALL)
with open('src/pages/AdminDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('SUCCESS')
