# Zestra

> An intelligent, real-time digital dining and restaurant management platform featuring QR-based digital menus, instant order processing, inventory tracking, live WebSocket updates, and AI-driven operational insights.

---

## Team

- **Team Name**: CodeDuo
- **Team Lead**: Aniket Bhil

### Team Members & Contributions

| Member Name | Role | Primary Contributions |
| :--- | :--- | :--- |
| **Aniket Bhil** (`aniketbhil99@gmail.com`) | Backend Lead & Full-Stack Engineer | FastAPI architecture, PostgreSQL/SQLAlchemy ORM models, Alembic database migrations, Redis client & ARQ background worker, JWT & Google OAuth 2.0 PKCE authentication, WebSocket connection manager for real-time order/menu streaming, Google Gemini 2.5 Flash AI insights integration, and unit/integration testing suite. |
| **Krehant Gajjar** (`krehantgajjar101106@gmail.com`) | Frontend Lead & UI/UX Engineer | Vite + React 19 application setup, Tailwind CSS design system, Axios API client & Zustand global state stores, authentication UI & Google OAuth callback handler, role-based dashboard layout, QR code rendering & printing, public digital menu & checkout experience, and live order tracking UI. |

---

## Problem Statement

Traditional restaurant operations suffer from inefficient paper menus, slow order fulfillment cycles, lack of real-time communication between customers and kitchen staff, and manual inventory tracking that often leads to stockouts or wasted ingredients. Furthermore, restaurant owners lack actionable, real-time analytics and predictive insights to optimize daily operations. 

Zestra solves these pain points by unifying the customer dining experience and back-of-house management into a single platform. Customers scan table QR codes to view dynamic digital menus, place orders, and track preparation status in real time. Simultaneously, restaurant managers receive instant order stream notifications, automatic inventory deductions upon order placement, low-stock alerts, and AI-generated executive insights to streamline kitchen operations and maximize revenue.

---

## Tech Stack

### Backend
- **Core Framework**: Python (>=3.14), FastAPI (v0.140.0), Uvicorn ASGI server (v0.51.0)
- **Database & ORM**: PostgreSQL, SQLAlchemy AsyncIO (v2.0.51), Asyncpg (v0.31.0), Alembic (v1.18.5)
- **Caching & Async Workers**: Redis (v5.3.1), ARQ background task queue (v0.28.0)
- **Authentication & Security**: Argon2-cffi (v25.1.0) password hashing, PyJWT (v2.13.0), Google OAuth 2.0 with PKCE flow
- **AI Integration**: Google GenAI SDK (`google-genai` >=v2.14.0) using the `gemini-2.5-flash` model
- **Utilities & Testing**: QRCode PIL (v8.2), HTTPX (v0.28.1), Pydantic (v2.13.4), Pydantic-Settings (v2.14.2), Pytest (v9.1.1), pytest-asyncio (v1.4.0), aiosqlite (v0.22.1)

### Frontend
- **Core Framework**: React 19 (`react` ^19.2.7), Vite (`vite` ^8.1.1)
- **Styling & UI**: Tailwind CSS v4 (`@tailwindcss/vite` ^4.3.3), Lucide React icons (`lucide-react` ^1.27.0)
- **State Management & Routing**: Zustand (`zustand` ^5.0.14), React Router v7 (`react-router-dom` ^7.18.1)
- **API & Utilities**: Axios (`axios` ^1.18.1), JWT Decode (`jwt-decode` ^4.0.0), React Hot Toast (`react-hot-toast` ^2.6.0), Recharts (`recharts` ^3.10.1)

---

## Key Features

### 1. Authentication & User Management
- **Multi-Method Auth**: Email/password registration and login with Argon2 password hashing.
- **Google OAuth 2.0 PKCE**: Seamless Google sign-in flow that automatically creates or links user accounts and issues JWT tokens.
- **Role-Based Access Control**: Strict segregation between `customer` and `restaurant` roles.
- **Token Security**: JWT Access & Refresh token rotation with Redis-backed refresh token revocation/blacklisting.
- **Profile & Password Settings**: User profile updates and password change endpoints.

### 2. Restaurant & Menu Management
- **Restaurant Onboarding**: Single-step onboarding generating a unique URL slug (`generate_unique_slug`).
- **Full Menu CRUD**: Category organization, item pricing, descriptions, availability toggling, and image URL attachments.
- **Ingredient Mapping**: Map menu items to inventory ingredients with required quantities per item.
- **Real-Time Availability Broadcasting**: Toggling a menu item's availability instantly notifies connected clients via WebSocket.

### 3. QR Code & Public Digital Menu
- **Dynamic QR Code Generation**: Backend generates Base64 PNG QR code strings pointing directly to `/menu/{slug}`.
- **Customer Discovery**: Public restaurant listing page (`/public/restaurants`) for customer restaurant selection.
- **Interactive Digital Menu**: Filter by categories, live search, add items to cart, and customize order quantities.

### 4. Real-Time Order Management
- **Instant Order Placement**: Customer checkout (`POST /public/orders/{slug}`) validating item availability, calculating total amounts, and deducting required ingredient stock.
- **Dual WebSocket Streams**:
  - `/ws/orders/{slug}`: Pushes live incoming order notifications directly to the restaurant kitchen dashboard.
  - `/ws/orders/track/{order_id}`: Stream real-time status updates directly to the customer's order tracking screen.
- **Order State Machine**: Enforces valid status transitions (`received` $\rightarrow$ `preparing` $\rightarrow$ `ready` $\rightarrow$ `served`).

### 5. Inventory & Analytics
- **Inventory Tracking**: Manage ingredient quantities, units of measurement, and custom low-stock thresholds.
- **Automated Low-Stock Alerts**: Background cron job (`check_low_stock_cron`) running every 5 minutes to scan stock levels and broadcast alerts to `/ws/alerts/{slug}`.
- **Sales Analytics Dashboard**: Aggregates total revenue, total orders count, active order count, and top 5 best-selling menu items.

### 6. AI Features
- **Executive AI Assistant**: Integrates Google Gemini 2.5 Flash (`google.genai`) to analyze daily sales, peak order hours, and popular items, returning structured operational recommendations for restaurant owners.
- **Redis AI Caching**: Caches Gemini responses in Redis for 1 hour (`ai_insights:{restaurant_id}`) with support for forced user refresh (`?refresh=true`).
- **Smart Menu Recommendations**: Customer recommendation endpoint (`/ai/recommendations`) suggesting un-ordered items based on customer ordering history or top-selling items.

### 7. Restaurant Settings
- **Operational Configuration**: Manage operational status (open/closed), custom domains, tax rates, currency symbols, contact details, and opening hours.

---

## Beta & Incomplete Features

- **ARQ Worker Task Notifications**: The background task `notify_order_placed` currently functions as a logging stub (`logger.info(f"Order {order_id} confirmed")`) instead of sending external emails or push notifications.
- **In-Memory WebSocket Connection Manager**: The `ConnectionManager` handles active WebSocket sockets in-memory within the running FastAPI process. Scaling horizontally across multiple server nodes will require connecting Redis Pub/Sub to the WebSocket manager.
- **Customer QR Code View**: In `CustomerHome.jsx`, the customer QR code preview is generated client-side using `api.qrserver.com` to allow unauthenticated exploration, while the authenticated restaurant owner QR endpoint (`/restaurants/me/qrcode`) renders backend-generated base64 PNGs.

---

## Live Deployment Links

- **Frontend Application (Vercel)**: `https://zestra-lac.vercel.app`
- **Backend API (Render)**: `https://zestra.onrender.com`

---

## GitHub Repository

- **Repository Link**: `https://github.com/Aniketbhil/Zestra`

---

## Local Setup Instructions

### Prerequisites
- Python 3.14+ (or Python 3.12+)
- Node.js 18+ and npm
- PostgreSQL database
- Redis instance

---

### Backend Setup (`zestra-backend`)

1. **Navigate to the backend directory**:
   ```bash
   cd zestra-backend
   ```

2. **Create and activate a virtual environment**:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows use: .venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -e .
   ```

4. **Set up environment variables**:
   Create a `.env` file in `zestra-backend/` based on `.env.example`:
   ```ini
   PROJECT_NAME="Zestra Backend"
   ENVIRONMENT="development"
   SECRET_KEY="your-secret-key"
   JWT_ALGORITHM="HS256"
   ACCESS_TOKEN_EXPIRE_MINUTES=30
   REFRESH_TOKEN_EXPIRE_DAYS=7

   DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:5432/zestra"
   REDIS_URL="redis://localhost:6379/0"

   FRONTEND_BASE_URL="http://localhost:5173"
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"
   GOOGLE_REDIRECT_URI="http://localhost:8000/api/v1/auth/google/callback"

   GEMINI_API_KEY="your-gemini-api-key"
   ```

5. **Run database migrations**:
   ```bash
   alembic upgrade head
   ```

6. **Start the FastAPI backend server**:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

7. *(Optional)* **Start the ARQ background worker**:
   ```bash
   arq app.workers.worker.WorkerSettings
   ```

8. *(Optional)* **Run the test suite**:
   ```bash
   pytest
   ```

---

### Frontend Setup (`zestra-frontend`)

1. **Navigate to the frontend directory**:
   ```bash
   cd zestra-frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   Create a `.env` file in `zestra-frontend/` based on `.env.example`:
   ```ini
   VITE_API_BASE_URL=http://localhost:8000/api/v1
   ```

4. **Start the Vite development server**:
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:5173`.

5. **Build for production**:
   ```bash
   npm run build
   ```

---

## AI Usage Disclosure

- **Development Phase**: AI agentic tooling (Google DeepMind's Antigravity CLI) was utilized throughout development for codebase exploration, refactoring API route structures, building Zustand global state stores, standardizing real-time WebSocket protocol handlers, and verifying production builds.
- **Runtime Phase**: The application integrates the Google GenAI SDK (`google-genai`) with the `gemini-2.5-flash` model in `zestra-backend/app/api/v1/ai.py`. At runtime, Gemini analyzes live menu performance and order data to generate dynamic operational insights and recommendations for restaurant owners.
