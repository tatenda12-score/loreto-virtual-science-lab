import os

filepath = 'backend/app/schemas/user_schema.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

new_schema = '''
class UserPasswordUpdate(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def password_complexity(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter.")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit.")
        special_chars = set("!@#$%^&*()-_=+[]{}|;:',.<>?/")
        if not any(c in special_chars for c in v):
            raise ValueError("Password must contain at least one special character.")
        return v
'''
if 'UserPasswordUpdate' not in content:
    content += new_schema

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
