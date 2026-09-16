import os

filepath = 'C:/Users/DELL/.gemini/antigravity-ide/brain/278f0a56-2bfb-45ad-9b9b-172eecc6a9ed/walkthrough.md'
if os.path.exists(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    new_content = content + '''

## 4. Experiment Class Assignment
The "Experiments" tab has been updated to professionally indicate which class an experiment belongs to:
* **Experiment Builder:** When creating or editing an experiment, there is now a dedicated **Class Level** dropdown (e.g., Form 3, Form 4, or All Classes).
* **Dashboard Badges:** Experiments displayed on the Admin and Teacher dashboards now include a sleek, professional badge explicitly showing the assigned class right next to the subject and difficulty tags.
'''

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
