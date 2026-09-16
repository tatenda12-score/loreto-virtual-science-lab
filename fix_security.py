import os

filepath = 'backend/app/core/security.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Passlib's bcrypt has a 72 character limit. If plain_password is longer, or to fix the bug, we can truncate it.
content = content.replace("    return pwd_context.hash(plain_password)", "    return pwd_context.hash(plain_password[:72])")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
