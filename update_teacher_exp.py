import os

filepath = 'frontend/src/pages/TeacherDashboard.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add badge in TeacherDashboard experiments list
old_badges = '''                          <span className={	ext-xs px-2 py-0.5 rounded-md border font-medium }>
                            {statusBadge.label}
                          </span>
                        </div>'''

new_badges = '''                          <span className={	ext-xs px-2 py-0.5 rounded-md border font-medium }>
                            {statusBadge.label}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-md border bg-slate-100 border-slate-200 text-slate-700 font-medium">
                            Class: {exp.class_level || 'All'}
                          </span>
                        </div>'''
content = content.replace(old_badges, new_badges)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
