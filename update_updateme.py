import os
import re

filepath = 'updateme.txt'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Update Last updated
content = re.sub(r'Last updated: .*', 'Last updated: 16 September 2026', content)

# Update WHAT IS WORKING
what_is_working_old = '''WHAT IS WORKING:
  ? Backend API is complete and running
  ? All authentication and RBAC is working
  ? Experiments CRUD is working
  ? Submissions with auto-grading is working
  ? Science engine (Ohm's Law, Titration, pH, Velocity) is working
  ? Database seeder populates demo data successfully
  ? Frontend login flow with JWT auth is working
  ? Student dashboard with interactive Ohm's Law simulation is working
  ? Teacher dashboard with grading panel is working
  ? Vite proxy to FastAPI backend is working
  ? Backend virtual environment dependencies installed to fix IDE "Cannot find module" errors (sqlalchemy, pydantic, etc.)'''

what_is_working_new = '''WHAT IS WORKING:
  ? Backend API is complete and running
  ? All authentication and RBAC is working
  ? Password change functionality added for authenticated users
  ? Experiments CRUD is working (with Class Level assignments)
  ? Submissions with auto-grading (instantly marked as graded) is working
  ? Science engine (Ohm's Law, Titration, pH, Velocity) is working
  ? Database seeder populates demo data successfully
  ? Frontend login flow with JWT auth is working
  ? Student dashboard with interactive Ohm's Law simulation is working
  ? Students strictly restricted to viewing experiments for their assigned class
  ? Teacher dashboard with grading panel is working
  ? Teachers strictly restricted to viewing submissions from their assigned class
  ? Admin Dashboard fully functional (Manage Users, Classes, Experiments, Audit Logs)
  ? Experiment Builder (UI for creating/editing experiments) integrated on frontend
  ? Vite proxy to FastAPI backend is working
  ? Backend virtual environment dependencies installed to fix IDE "Cannot find module" errors'''

content = content.replace(what_is_working_old, what_is_working_new)

# Update WHAT COULD BE DONE NEXT (remove completed items)
what_next_old = '''WHAT COULD BE DONE NEXT (not yet built):
  - Additional interactive simulations (Titration, pH, Velocity)
  - Admin panel for user management (create/deactivate users)
  - Student registration page (currently only via API POST /register)
  - Email verification flow
  - Password reset functionality
  - Experiment creation form on the frontend (currently API-only)
  - File/image upload for experiment instructions
  - Student leaderboard / analytics
  - Print/export lab reports as PDF
  - Deploy to production (PostgreSQL, domain, HTTPS)
  - Unit tests (backend + frontend)
  - Mobile responsive polish
  - Biology experiments'''

what_next_new = '''WHAT COULD BE DONE NEXT (not yet built):
  - Additional interactive simulations (Titration, pH, Velocity)
  - Student registration page (currently only via API POST /register)
  - Email verification flow
  - Password reset functionality via Email (forgot password)
  - File/image upload for experiment instructions
  - Student leaderboard / analytics
  - Print/export lab reports as PDF
  - Deploy to production (PostgreSQL, domain, HTTPS)
  - Unit tests (backend + frontend)
  - Mobile responsive polish
  - Biology experiments'''

content = content.replace(what_next_old, what_next_new)

# Update KEY DESIGN DECISIONS
key_decisions_old = '''  5. Submission lifecycle: draft ? submitted ? graded, enforced at API level.'''
key_decisions_new = '''  5. Submission lifecycle: draft ? graded (instantly auto-graded on submission).'''
content = content.replace(key_decisions_old, key_decisions_new)

key_decisions_add = '''
  8. Class-based access control:
     - Experiments can be assigned to a specific class (e.g. Form4).
     - Students only see experiments matching their class.
     - Teachers only see student submissions matching their class.'''
content = content.replace('''  7. JWT tokens stored in localStorage (simple for demo; production should
     consider httpOnly cookies for better security).''', '''  7. JWT tokens stored in localStorage (simple for demo; production should
     consider httpOnly cookies for better security).''' + key_decisions_add)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
