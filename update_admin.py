import os

filepath = 'backend/app/schemas/admin_schema.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('    gender: Optional[str] = Field(default=None, max_length=20)', '    gender: Optional[str] = Field(default=None, max_length=20)\n    class_level: Optional[str] = Field(default=None, max_length=50)')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)


filepath = 'backend/app/api/v1/endpoints/admin.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('        subject_code=payload.subject_code,\n        gender=payload.gender,', '        subject_code=payload.subject_code,\n        gender=payload.gender,\n        class_level=payload.class_level,')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
