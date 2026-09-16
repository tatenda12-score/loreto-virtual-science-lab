import sqlite3
import os

db_path = 'backend/loreto_lab.db'
if not os.path.exists(db_path):
    print("DB not found")
else:
    conn = sqlite3.connect(db_path)
    try:
        conn.execute('ALTER TABLE experiments ADD COLUMN class_level VARCHAR(50);')
        print("Column added")
    except Exception as e:
        print("Error:", e)
    conn.commit()
    conn.close()
