import os

main_path = 'backend/app/main.py'
with open(main_path, 'r', encoding='utf-8') as f:
    content = f.read()

new_fix = '''
@app.post("/setup/fix_enums", tags=["System"])
def fix_enums():
    from sqlalchemy import text
    from app.db.database import SessionLocal
    import logging
    try:
        with SessionLocal() as db:
            db.execute(text("ALTER TYPE simulation_type_enum ADD VALUE IF NOT EXISTS 'food_tests';"))
            db.execute(text("ALTER TYPE simulation_type_enum ADD VALUE IF NOT EXISTS 'separation';"))
            db.execute(text("ALTER TYPE simulation_type_enum ADD VALUE IF NOT EXISTS 'moments';"))
            try:
                db.execute(text("ALTER TABLE experiments ADD COLUMN IF NOT EXISTS class_level VARCHAR(255);"))
            except Exception as e:
                logging.error(f"Error adding column to experiments: {e}")
            try:
                db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS class_level VARCHAR(255);"))
            except Exception as e:
                logging.error(f"Error adding column to users: {e}")
            db.commit()
        return {"status": "ok", "message": "Enums and columns updated"}
    except Exception as exc:
        logging.error(f"Enum update failed: {exc}")
        return {"status": "error", "detail": str(exc)}
'''

import re
content = re.sub(r'@app\.post\("/setup/fix_enums".*?return \{"status": "error", "detail": str\(exc\)\}', new_fix.strip(), content, flags=re.DOTALL)

with open(main_path, 'w', encoding='utf-8') as f:
    f.write(content)
