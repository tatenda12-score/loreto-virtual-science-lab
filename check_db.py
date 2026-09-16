import sqlite3

db_path = 'backend/loreto_lab.db'
conn = sqlite3.connect(db_path)
c = conn.cursor()
c.execute("SELECT email, class_level FROM users WHERE role='student' ORDER BY id DESC LIMIT 5")
for row in c.fetchall():
    print(row)
