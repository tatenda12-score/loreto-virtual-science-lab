import os
import re

filepath = 'frontend/src/pages/AdminDashboard.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add class_level to state
content = content.replace(
    "const [newTeacher, setNewTeacher] = useState({ full_name: '', email: '', password: '', subject_code: '', gender: '' })",
    "const [newTeacher, setNewTeacher] = useState({ full_name: '', email: '', password: '', subject_code: '', gender: '', class_level: '' })"
)

# 2. Add class_level select input in the form
old_form_part = '''                <select required className="bg-white border border-slate-300 rounded-md px-4 py-2 text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 shadow-sm" value={newTeacher.gender} onChange={e => setNewTeacher({...newTeacher, gender: e.target.value})}>
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>'''

new_form_part = '''                <select required className="bg-white border border-slate-300 rounded-md px-4 py-2 text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 shadow-sm" value={newTeacher.gender} onChange={e => setNewTeacher({...newTeacher, gender: e.target.value})}>
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
                <select required className="bg-white border border-slate-300 rounded-md px-4 py-2 text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 shadow-sm" value={newTeacher.class_level} onChange={e => setNewTeacher({...newTeacher, class_level: e.target.value})}>
                  <option value="">Select Class</option>
                  <option value="Form3">Form 3</option>
                  <option value="Form4">Form 4</option>
                  <option value="L6">Lower 6</option>
                  <option value="Upper6">Upper 6</option>
                </select>'''
content = content.replace(old_form_part, new_form_part)

# 3. Fix handleCreateTeacher error alert
old_handle_create = '''  async function handleCreateTeacher(e: React.FormEvent) {
    e.preventDefault()
    try {
      const created = await createTeacher(newTeacher)
      setTeachers([created, ...teachers])
      setShowCreateTeacher(false)
      setNewTeacher({ full_name: '', email: '', password: '', subject_code: '', gender: '' })
    } catch (e) {
      alert('Failed to create teacher.')
    }
  }'''

new_handle_create = '''  async function handleCreateTeacher(e: React.FormEvent) {
    e.preventDefault()
    try {
      const created = await createTeacher(newTeacher)
      setTeachers([created, ...teachers])
      setShowCreateTeacher(false)
      setNewTeacher({ full_name: '', email: '', password: '', subject_code: '', gender: '', class_level: '' })
    } catch (e: any) {
      alert(e.message || 'Failed to create teacher.')
    }
  }'''
content = content.replace(old_handle_create, new_handle_create)

# 4. Display class_level in teachers list
content = content.replace(
    "<p className=\"text-sm text-slate-500\">{t.email} &bull; {t.subject_code}</p>",
    "<p className=\"text-sm text-slate-500\">{t.email} &bull; {t.subject_code} &bull; Class: {t.class_level || 'N/A'}</p>"
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
