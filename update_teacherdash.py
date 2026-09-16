import os

filepath = 'frontend/src/pages/TeacherDashboard.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Import changePassword
content = content.replace(
    "  updateExperiment,\n  type Experiment,",
    "  updateExperiment,\n  changePassword,\n  type Experiment,"
)

# Add state
state_injection = '''
  // Password modal state
  const [showPwdModal, setPwdModal] = useState(false)
  const [pwdCurrent, setPwdCurrent] = useState('')
  const [pwdNew, setPwdNew] = useState('')
  const [pwdMsg, setPwdMsg] = useState<string | null>(null)
  
  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setPwdMsg(null)
    try {
      await changePassword({ current_password: pwdCurrent, new_password: pwdNew })
      setPwdMsg('Password updated successfully!')
      setTimeout(() => {
        setPwdModal(false)
        setPwdCurrent('')
        setPwdNew('')
        setPwdMsg(null)
      }, 2000)
    } catch (err: any) {
      setPwdMsg(err.message || 'Failed to update password')
    }
  }
'''
content = content.replace(
    "  const [gradeMsg,      setGradeMsg]      = useState<string | null>(null)",
    "  const [gradeMsg,      setGradeMsg]      = useState<string | null>(null)\n" + state_injection
)

# Add "Change Password" button next to "Sign out"
btn_injection = '''
            <button
              onClick={() => setPwdModal(true)}
              className="text-xs px-3 py-1.5 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
            >
              Change Password
            </button>
'''
content = content.replace(
    '''            <button
              id="teacher-logout"''',
    btn_injection + '''            <button
              id="teacher-logout"'''
)

# Add password modal markup before the end of the main div
modal_markup = '''
      {showPwdModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-sm w-full p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Change Password</h2>
            {pwdMsg && <p className="text-sm font-semibold mb-4 text-blue-600">{pwdMsg}</p>}
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Current Password</label>
                <input required type="password" value={pwdCurrent} onChange={e => setPwdCurrent(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none shadow-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">New Password</label>
                <input required type="password" value={pwdNew} onChange={e => setPwdNew(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none shadow-sm" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setPwdModal(false)} className="px-4 py-2 text-sm font-semibold border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
'''
content = content.replace(
    "    </div>\n  )\n}",
    modal_markup + "    </div>\n  )\n}"
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
