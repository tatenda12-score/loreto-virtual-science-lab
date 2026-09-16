import os

filepath = 'frontend/src/components/experiments/ExperimentBuilder.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add class_level to default form values
content = content.replace(
    "    topic: experiment?.topic ?? '',",
    "    topic: experiment?.topic ?? '',\n    class_level: experiment?.class_level ?? '',"
)

# Add the UI field for class_level right after Topic
topic_field = '''            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Topic</label>
              <input
                type="text"
                value={form.topic}
                onChange={e => setForm({ ...form, topic: e.target.value })}
                placeholder="e.g. Current Electricity"
                className="w-full bg-white border border-slate-300 rounded-md px-4 py-2 text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 shadow-sm"
              />
            </div>'''

class_level_field = '''            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Class Level</label>
              <select
                value={form.class_level}
                onChange={e => setForm({ ...form, class_level: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-md px-4 py-2 text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 shadow-sm"
              >
                <option value="">All Classes</option>
                <option value="Form3">Form 3</option>
                <option value="Form4">Form 4</option>
                <option value="L6">Lower 6</option>
                <option value="Upper6">Upper 6</option>
              </select>
            </div>'''

content = content.replace(topic_field, topic_field + '\n' + class_level_field)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
