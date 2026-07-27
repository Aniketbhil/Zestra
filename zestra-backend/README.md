# Zestra Backend Deployment Guide

## Render Deployment

This service can be deployed on [Render](https://render.com) using Infrastructure-as-Code via `render.yaml` or through manual Web Service setup in the Render Dashboard.

### Service Configuration
- **Service Type**: Web Service
- **Runtime**: Python
- **Build Command**: `uv sync`
- **Start Command**: `uv run uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Environment Variables

Set the following environment variables in the Render Dashboard:

| Variable Name | Description | Example / Note |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection string (asyncpg format) | `postgresql+asyncpg://user:pass@host/dbname` |
| `REDIS_URL` | Redis / Upstash connection URL | `rediss://default:token@host:port` |
| `JWT_SECRET` | Secret key for signing JWT tokens | Random string (e.g. 64-char hex) |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | `xxxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | `GOCSPX-xxxx` |
| `GOOGLE_REDIRECT_URI` | Google OAuth Redirect URI callback | `https://your-api.onrender.com/api/v1/auth/google/callback` |
| `GEMINI_API_KEY` | Google Gemini API key for AI Insights | `AIzaSy...` |
| `FRONTEND_BASE_URL` | Production Frontend Base URL | `https://your-app.vercel.app` |
