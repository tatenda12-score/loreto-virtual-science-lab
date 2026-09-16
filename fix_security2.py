import os

filepath = 'backend/app/core/security.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("    return pwd_context.verify(plain_password, hashed_password)", "    return pwd_context.verify(plain_password[:72], hashed_password)")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
