import os

# 1. Update backend/app/models/experiment.py
filepath = 'backend/app/models/experiment.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

new_column = '''    description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        comment="Overview paragraph shown to students before they start",
    )
    class_level: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        comment="Target class level (e.g., Form3, L6). Null means available to all.",
    )'''
content = content.replace('''    description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        comment="Overview paragraph shown to students before they start",
    )''', new_column)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

# 2. Update backend/app/schemas/experiment_schema.py
filepath = 'backend/app/schemas/experiment_schema.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

new_schema_field = '''    topic: Optional[str] = Field(
        default=None,
        max_length=255,
        description="Curriculum topic e.g. Current Electricity",
    )
    class_level: Optional[str] = Field(
        default=None,
        max_length=50,
        description="Target class level (e.g., Form3, Form4). None means all classes.",
    )'''
content = content.replace('''    topic: Optional[str] = Field(
        default=None,
        max_length=255,
        description="Curriculum topic e.g. Current Electricity",
    )''', new_schema_field)

new_update_field = '''    topic: Optional[str] = Field(default=None, max_length=255)
    class_level: Optional[str] = Field(default=None, max_length=50)'''
content = content.replace("    topic: Optional[str] = Field(default=None, max_length=255)", new_update_field)

new_response_field = '''    topic: Optional[str] = None
    class_level: Optional[str] = None'''
content = content.replace("    topic: Optional[str] = None", new_response_field)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

