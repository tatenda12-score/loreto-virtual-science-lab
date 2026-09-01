"""
scripts/create_admin.py
-----------------------
Bootstraps a production admin account securely.
Usage:
    python -m scripts.create_admin
"""

import sys
import getpass
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from dotenv import load_dotenv
load_dotenv(BACKEND_DIR / ".env")

from app.core.security import hash_password
from app.db.database import SessionLocal
from app.models.user import User, UserRole

def create_admin():
    print("========================================")
    print(" Secure Admin Bootstrap Utility")
    print("========================================")
    print("This will create a new administrator account.")
    
    full_name = input("Admin Full Name: ").strip()
    if not full_name:
        print("Name cannot be empty.")
        sys.exit(1)
        
    email = input("Admin Email: ").strip()
    if not email:
        print("Email cannot be empty.")
        sys.exit(1)
        
    password = getpass.getpass("Admin Password: ")
    if len(password) < 8:
        print("Password must be at least 8 characters.")
        sys.exit(1)
        
    confirm_password = getpass.getpass("Confirm Password: ")
    if password != confirm_password:
        print("Passwords do not match.")
        sys.exit(1)

    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            print(f"Error: Account with email {email} already exists.")
            sys.exit(1)
            
        admin = User(
            full_name=full_name,
            email=email,
            hashed_password=hash_password(password),
            role=UserRole.admin,
            is_active=True,
            is_verified=True,
        )
        db.add(admin)
        db.commit()
        print(f"\nSuccess! Administrator {email} created successfully.")
    except Exception as e:
        db.rollback()
        print(f"An error occurred: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    create_admin()
