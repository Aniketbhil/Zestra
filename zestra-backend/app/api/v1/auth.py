from datetime import datetime, timezone
import hashlib
from uuid import UUID
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
import httpx
import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_current_user
from app.core.redis import redis_client
from app.db.session import get_db
from app.models.user import AuthProvider, User, UserRole
from app.schemas.auth import (
    ChangePasswordRequest,
    RefreshTokenRequest,
    TokenResponse,
    UserLoginRequest,
    UserRegisterRequest,
)
from app.schemas.user import UserResponse
from app.services.security import generate_token_pair, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["Auth"])

_blacklisted_refresh_tokens: set[str] = set()


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register(
    payload: UserRegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    """Register a new user (customer or restaurant only)."""
    # Check for duplicate email
    query = select(User).where(User.email == payload.email)
    result = await db.execute(query)
    existing_user = result.scalars().first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already registered.",
        )

    # Hash password using Argon2
    hashed_pwd = hash_password(payload.password)

    user = User(
        email=payload.email,
        hashed_password=hashed_pwd,
        auth_provider=AuthProvider.LOCAL,
        role=UserRole(payload.role.value),
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    return generate_token_pair(str(user.id), user.email, user.role.value)


@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
)
async def login(
    payload: UserLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """Authenticate a local user and return access/refresh tokens."""
    query = select(User).where(User.email == payload.email)
    result = await db.execute(query)
    user = result.scalars().first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if user.auth_provider != AuthProvider.LOCAL:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account was created with Google sign-in. Please use Google sign-in instead.",
        )

    if not user.hashed_password or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is inactive.",
        )

    return generate_token_pair(str(user.id), user.email, user.role.value)


@router.post(
    "/refresh",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
)
async def refresh_token(
    payload: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
):
    """Issue a new token pair using a valid refresh token."""
    try:
        decoded = jwt.decode(
            payload.refresh_token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token.",
        )

    if decoded.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provided token is not a refresh token.",
        )

    # Check if refresh token has been blacklisted / invalidated
    token_id = (
        decoded.get("jti")
        or hashlib.sha256(payload.refresh_token.encode()).hexdigest()
    )
    is_blacklisted = False
    try:
        val = await redis_client.get(f"blacklist:refresh:{token_id}")
        if val is not None:
            is_blacklisted = True
    except Exception:
        pass

    if is_blacklisted or token_id in _blacklisted_refresh_tokens:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has been logged out or invalidated.",
        )

    user_id_str = decoded.get("sub")
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token payload.",
        )

    try:
        user_id = UUID(user_id_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID format in token.",
        )

    user = await db.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User associated with refresh token is invalid or inactive.",
        )

    return generate_token_pair(str(user.id), user.email, user.role.value)


@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
)
async def logout(
    payload: RefreshTokenRequest,
):
    """Invalidate a refresh token so it can no longer be used at /auth/refresh.

    Blacklists the refresh token in Redis (and in-memory fallback) for its remaining lifetime.
    Access tokens expire naturally within their short lifespan.
    """
    try:
        decoded = jwt.decode(
            payload.refresh_token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired refresh token.",
        )

    if decoded.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provided token is not a refresh token.",
        )

    token_id = (
        decoded.get("jti")
        or hashlib.sha256(payload.refresh_token.encode()).hexdigest()
    )
    exp = decoded.get("exp")
    if exp:
        remaining_ttl = int(exp - datetime.now(timezone.utc).timestamp())
        ttl = max(remaining_ttl, 60)
    else:
        ttl = settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400

    try:
        await redis_client.set(f"blacklist:refresh:{token_id}", "true", ex=ttl)
    except Exception:
        pass

    _blacklisted_refresh_tokens.add(token_id)

    return {"message": "Successfully logged out."}


@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
)
async def get_me(
    current_user: User = Depends(get_current_user),
):
    """Get profile of current authenticated user."""
    return current_user


@router.get("/google/login")
def google_login(role: UserRole = Query(default=UserRole.CUSTOMER)):
    """Redirect to Google's OAuth consent screen."""
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_REDIRECT_URI:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google OAuth is not configured properly.",
        )

    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "state": role.value,
        "prompt": "consent",
    }
    authorization_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    )
    return RedirectResponse(url=authorization_url)


@router.get("/google/callback")
async def google_callback(
    code: str,
    state: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Exchange authorization code for Google user info, find or create User,

    and return JWT access/refresh token pair.
    """
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google OAuth client credentials missing.",
        )

    token_url = "https://oauth2.googleapis.com/token"
    token_data = {
        "code": code,
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "grant_type": "authorization_code",
    }

    async with httpx.AsyncClient() as client:
        token_response = await client.post(token_url, data=token_data)
        if token_response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to retrieve access token from Google.",
            )
        tokens = token_response.json()
        google_access_token = tokens.get("access_token")

        userinfo_url = "https://www.googleapis.com/oauth2/v2/userinfo"
        headers = {"Authorization": f"Bearer {google_access_token}"}
        userinfo_response = await client.get(userinfo_url, headers=headers)
        if userinfo_response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to retrieve user info from Google.",
            )
        user_info = userinfo_response.json()

    google_id = user_info.get("id") or user_info.get("sub")
    email = user_info.get("email")

    if not google_id or not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google account did not return a valid ID or email.",
        )

    # Find existing user by google_id or email
    query = select(User).where(
        (User.google_id == google_id) | (User.email == email)
    )
    result = await db.execute(query)
    user = result.scalars().first()

    if user:
        if not user.google_id:
            user.google_id = google_id
            user.auth_provider = AuthProvider.GOOGLE
            await db.commit()
            await db.refresh(user)
    else:
        assigned_role = UserRole.CUSTOMER
        if state and state.lower() == UserRole.RESTAURANT.value:
            assigned_role = UserRole.RESTAURANT

        user = User(
            email=email,
            auth_provider=AuthProvider.GOOGLE,
            google_id=google_id,
            role=assigned_role,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    tokens = generate_token_pair(str(user.id), user.email, user.role.value)
    redirect_url = f"{settings.FRONTEND_BASE_URL}/oauth/callback#access_token={tokens['access_token']}&refresh_token={tokens['refresh_token']}"
    return RedirectResponse(url=redirect_url)


@router.patch("/change-password", status_code=status.HTTP_200_OK)
async def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Change password for an authenticated local user.

    - Rejects with 400 if auth_provider != local ("password managed by Google — no local password to change").
    - Verifies current_password with Argon2.
    - Validates new_password against complexity rules (min 8 chars, 1 upper, 1 lower, 1 special char).
    - Hashes and updates password.
    """
    if current_user.auth_provider != AuthProvider.LOCAL:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="password managed by Google — no local password to change",
        )

    if not current_user.hashed_password or not verify_password(
        payload.current_password, current_user.hashed_password
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password.",
        )

    current_user.hashed_password = hash_password(payload.new_password)
    await db.commit()

    return {"message": "Password changed successfully."}


