import sqlite3
conn = sqlite3.connect('backend/loreto_lab.db')
c = conn.cursor()
c.execute("SELECT id, title, class_level FROM experiments;")
for row in c.fetchall():
    print(row)
conn.close()
