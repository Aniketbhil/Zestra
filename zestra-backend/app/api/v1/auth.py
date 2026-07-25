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
from app.db.session import get_db
from app.models.user import AuthProvider, User, UserRole
from app.schemas.auth import (
    RefreshTokenRequest,
    TokenResponse,
    UserLoginRequest,
    UserRegisterRequest,
)
from app.schemas.user import UserResponse
from app.services.security import generate_token_pair, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["Auth"])


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

    return generate_token_pair(str(user.id), user.email, user.role.value)
