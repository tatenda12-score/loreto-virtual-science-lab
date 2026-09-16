import os

filepath = 'frontend/src/pages/AdminDashboard.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add badge in renderExperiments
old_badges = '''                    <span className={	ext-xs px-2 py-0.5 rounded-md border font-medium }>
                      {STATUS_BADGE[exp.status]?.label ?? exp.status}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">{exp.difficulty}</span>'''

new_badges = '''                    <span className={	ext-xs px-2 py-0.5 rounded-md border font-medium }>
                      {STATUS_BADGE[exp.status]?.label ?? exp.status}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-md border bg-slate-100 border-slate-200 text-slate-700 font-medium">
                      Class: {exp.class_level || 'All'}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">{exp.difficulty}</span>'''
content = content.replace(old_badges, new_badges)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
