import os
import sys

# Ensure backend is in the path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from dotenv import load_dotenv

# Load environment variables, defaulting to .env if running locally
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

from sqlalchemy import or_
from app.db.database import SessionLocal
from app.models.user import User

def delete_jss_ss_students():
    db = SessionLocal()
    try:
        # Find students in JSS or SS classes
        students_to_delete = db.query(User).filter(
            or_(
                User.class_level.like('JSS%'),
                User.class_level.like('SS%')
            )
        ).all()
        
        if not students_to_delete:
            print("No students found with class starting with JSS or SS.")
            return

        print(f"Found {len(students_to_delete)} students to delete.")
        for student in students_to_delete:
            print(f"Deleting student: {student.full_name} ({student.email}) - Class: {student.class_level}")
            db.delete(student)
            
        db.commit()
        print(f"Successfully deleted {len(students_to_delete)} students.")
    except Exception as e:
        db.rollback()
        print(f"An error occurred: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    delete_jss_ss_students()
