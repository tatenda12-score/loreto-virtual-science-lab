import os

filepath = 'backend/app/api/v1/endpoints/auth.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add UserPasswordUpdate to imports
if 'UserPasswordUpdate' not in content:
    content = content.replace('UserCreate, UserRegister, UserResponse', 'UserCreate, UserRegister, UserResponse, UserPasswordUpdate')

new_endpoint = '''
# ---------------------------------------------------------------------------
# PATCH /password
# ---------------------------------------------------------------------------
@router.patch(
    "/password",
    summary="Change user password",
    description="Allows an authenticated user to change their own password.",
)
def change_password(
    payload: UserPasswordUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password.",
        )
    
    current_user.hashed_password = hash_password(payload.new_password)
    db.flush()
    db.refresh(current_user)
    return {"detail": "Password successfully updated"}
'''

if '# PATCH /password' not in content:
    content += new_endpoint

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
