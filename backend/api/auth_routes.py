from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
import os
from authlib.integrations.starlette_client import OAuth
from auth import create_jwt_token, get_current_user
from database import create_user, get_user_by_id

router = APIRouter(prefix="/auth", tags=["auth"])

# Google OAuth configuration
oauth = OAuth()
oauth.register(
    name='google',
    client_id=os.getenv("GOOGLE_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'}
)

@router.get("/google")
async def google_login(request: Request):
    """Redirect to Google OAuth."""
    redirect_uri = request.url_for('google_callback')
    return await oauth.google.authorize_redirect(request, redirect_uri)

@router.get("/google/callback")
async def google_callback(request: Request):
    """Handle Google OAuth callback."""
    token = await oauth.google.authorize_access_token(request)
    user_info = token.get('userinfo')
    
    if not user_info:
        raise HTTPException(status_code=400, detail="Failed to get user info")
    
    # Create or update user in database
    user = create_user(
        user_id=user_info['sub'],
        email=user_info['email'],
        name=user_info.get('name'),
        picture_url=user_info.get('picture')
    )
    
    # Create JWT token
    jwt_token = create_jwt_token(
        user_id=user['user_id'],
        email=user['email'],
        name=user['name']
    )
    
    # Redirect to frontend with token
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    return RedirectResponse(f"{frontend_url}/login?token={jwt_token}")

@router.get("/me")
async def get_me(user_id: str = Depends(get_current_user)):
    """Get current user profile."""
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "name": user["name"],
        "picture_url": user["picture_url"]
    }
