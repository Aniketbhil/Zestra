# Zestra

> An intelligent, real-time digital dining and restaurant management platform featuring QR-based digital menus, instant order processing, inventory tracking, table reservations, Razorpay payments, live WebSocket updates, and AI-driven operational insights.

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

Traditional restaurant operations suffer from inefficient paper menus, slow order fulfillment cycles, lack of real-time communication between customers and kitchen staff, manual table reservation tracking, and unautomated inventory tracking that leads to stockouts or wasted ingredients. Furthermore, restaurant owners lack actionable, real-time analytics and predictive insights to optimize daily operations. 

Zestra solves these pain points by unifying the customer dining experience and back-of-house management into a single platform. Customers scan table QR codes to view dynamic digital menus, reserve table slots, place orders, make secure online payments, and track preparation status in real time. Simultaneously, restaurant managers receive instant order stream notifications, automatic inventory deductions upon order placement, low-stock alerts, table reservation management, and AI-generated executive insights to streamline kitchen operations and maximize revenue.

---

## Tech Stack

### Backend
- **Core Framework**: Python (>=3.14), FastAPI (v0.140.0), Uvicorn ASGI server (v0.51.0)
- **Database & ORM**: PostgreSQL, SQLAlchemy AsyncIO (v2.0.51), Asyncpg (v0.31.0), Alembic (v1.18.5)
- **Payment Processing**: Razorpay Python SDK (`razorpay` v2.0.1)
- **Caching & Async Workers**: Redis (v5.3.1), ARQ background task queue (v0.28.0)
- **Authentication & Security**: Argon2-cffi (v25.1.0) password hashing, PyJWT (v2.13.0), Google OAuth 2.0 with PKCE flow, 2Factor SMS OTP
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
- **Multi-Method Auth**: Email/password registration with OTP verification, password login, and password reset flows.
- **Google OAuth 2.0 PKCE**: Seamless Google sign-in flow that automatically creates or links user accounts and issues JWT tokens.
- **Role-Based Access Control**: Strict segregation between `customer`, `restaurant`, and `admin` roles.
- **Token Security**: JWT Access & Refresh token rotation with Redis-backed refresh token revocation/blacklisting.
- **Profile & Password Settings**: User profile management, contact details, and password change endpoints.

### 2. Restaurant & Menu Management
- **Restaurant Onboarding**: Single-step onboarding generating a unique URL slug (`generate_unique_slug`) and default table setup.
- **Table Count Expansion & Backfill**: Dynamically expand total tables via `PATCH /api/v1/restaurants/me` with automatic DB backfilling while strictly rejecting shrinking to prevent reservation orphan states.
- **Restaurant Soft-Delete**: Soft deletion (`is_deleted=True`) requiring explicit confirmation (`{"confirm": true}`), preserving user accounts for re-onboarding.
- **Full Menu CRUD**: Category organization, item pricing, descriptions, availability toggling, and image URL attachments.
- **Ingredient Mapping**: Map menu items to inventory ingredients with required quantities per item.
- **Real-Time Availability Broadcasting**: Toggling a menu item's availability instantly notifies connected clients via WebSocket (`/ws/menu/{slug}`).

### 3. QR Code & Public Digital Menu
- **Dynamic QR Code Generation**: Backend generates Base64 PNG QR code strings pointing directly to `/menu/{slug}`.
- **Customer Discovery**: Public restaurant listing page (`/public/restaurants`) for customer restaurant selection.
- **Interactive Digital Menu**: Filter by categories, live search, add items to cart, and customize order quantities.

### 4. Real-Time Order Management
- **Instant Order Placement**: Customer checkout (`POST /public/orders/{slug}`) validating item availability, calculating total amounts, and automatically deducting required ingredient stock.
- **Dual WebSocket Streams**:
  - `/ws/orders/{slug}`: Pushes live incoming order notifications directly to the restaurant kitchen dashboard.
  - `/ws/order:{order_id}`: Streams real-time status updates directly to the customer's order tracking screen.
- **Order State Machine**: Enforces valid status transitions (`received` $\rightarrow$ `preparing` $\rightarrow$ `ready` $\rightarrow$ `served`).

### 5. Inventory & Analytics
- **Inventory Tracking**: Manage ingredient quantities, units of measurement, and custom low-stock thresholds.
- **Automated Low-Stock Alerts**: Background cron job (`check_low_stock_cron`) running every 5 minutes to scan stock levels and broadcast alerts to `/ws/alerts/{slug}`.
- **Sales Analytics Dashboard**: Aggregates total revenue, total sales figures, order counts by hour, and top 5 best-selling menu items.

### 6. AI Features
- **Executive AI Assistant**: Integrates Google Gemini 2.5 Flash (`google.genai`) to analyze daily sales, peak order hours, and popular items, returning structured operational recommendations for restaurant owners.
- **Redis AI Caching**: Caches Gemini responses in Redis for 1 hour (`ai_insights:{restaurant_id}`) with support for forced user refresh (`?refresh=true`).
- **Smart Menu Recommendations**: Customer recommendation endpoint (`/ai/recommendations`) suggesting un-ordered items based on customer ordering history or top-selling items.

### 7. Table Reservations
- **Public Table Availability**: Public endpoint `GET /api/v1/public/tables/{slug}?date=YYYY-MM-DD` returning table numbers, seating capacities, and already-booked time slots.
- **Customer Reservation Placement**: `POST /api/v1/reservations` requiring `party_size` and validating against `table.capacity` (returning HTTP 400 if exceeded) and catching DB unique constraint conflicts (returning HTTP 409 Conflict).
- **Customer Reservation Management**: `GET /api/v1/reservations/me` and `PATCH /api/v1/reservations/{id}/cancel` (frees slot and broadcasts `table_update` to `/ws/tables/{slug}`).
- **Restaurant Dashboard Management**: `GET /api/v1/dashboard/reservations` with optional date filtering and `PATCH /api/v1/dashboard/reservations/{id}/status` to update reservation status (`completed` or `cancelled`).

### 8. Payments
- **Razorpay Order Creation**: `POST /api/v1/payments/create-order` accepts an internal order ID, converts total rupees to paise (`order.total * 100`), creates a Razorpay order, stores `razorpay_order_id`, and returns checkout credentials (`key_id`, `amount`, `currency`, `razorpay_order_id`).
- **Signature Verification**: `POST /api/v1/payments/verify` verifies HMAC signatures via `razorpay_client.utility.verify_payment_signature`, updates `payment_status` to `paid`, stores `razorpay_payment_id`, and broadcasts `payment_confirmed` on live WebSocket channels (`orders:{slug}` and `order:{order_id}`).
- **Webhook Endpoint**: Public `POST /api/v1/payments/webhook` verifies `X-Razorpay-Signature` against `RAZORPAY_WEBHOOK_SECRET` on `payment.captured` events, incorporating a double-processing guard against duplicate updates.
- **Order Model Tracking**: `Order` model tracks `payment_status` (`pending`, `paid`, `failed`), `razorpay_order_id`, and `razorpay_payment_id`.

### 9. Settings
- **Restaurant Configuration**: Manage contact numbers, business hours, notification preferences, image URLs, and restaurant details.

---

## Known Limitations

- **SMS OTP Delivery**: SMS OTP delivery may arrive as a voice call instead of text for numbers with DND registration or accounts without full DLT sender registration (a multi-day regulatory process not completed for this hackathon build); email OTP is the reliable primary channel.
- **Payment Integration in Test Mode**: Payment integration runs in Razorpay test mode — no real transactions occur.

  #### How to Test a Payment
  1. On the checkout screen, choose **Card** as the payment method.
  2. Enter a valid **Mastercard or RuPay test card number** from Razorpay's published test card list (Visa cards are not supported by Razorpay in test mode).
  3. Enter **any random 3-digit CVV** and **any future expiry date** — do not use a real card's actual CVV or expiry.
  4. Enter **any name** on the card (does not need to be real).
  5. Razorpay will prompt for an OTP. Since this is test mode, enter **any random 6-digit number** (e.g. `123456`) — it will be accepted automatically regardless of the actual cardholder.
  6. Alternatively, choose **Wallet** as the payment method instead of card — this redirects to a Razorpay test page with explicit **Success** or **Failure** buttons, letting you simulate either outcome directly without needing card details.

  *Note: UPI is currently unavailable due to pending KYC verification on the account.*

- **Free Tier Hosting Sleep**: The backend is hosted on Render's free tier, which sleeps after ~15 minutes of inactivity — the first request after a period of inactivity may take 30–60 seconds to respond while the service wakes up.

---

## BETA / Reserved for Future Work

- `[BETA]` **Staff Management**: Dedicated staff sub-roles (waiter, chef, manager), shift scheduling, and staff-level permissions beyond the primary restaurant owner role.
- `[BETA]` **Customer CRM View**: Restaurant dashboard customer directory, visit frequency analytics, repeat customer insights, and direct customer engagement tools (order/reservation data currently exists in DB tables but isn't surfaced as a CRM view).
- `[BETA]` **Table Duration & Overlap Handling**: Fixed-time slot reservations currently enforce exact slot matching; dynamic slot durations (e.g. 90-minute dining windows) and automatic overlap detection for staggered arrival times.
- `[BETA]` **Live SMS-Only OTP**: Pure SMS text delivery once full Indian DLT sender ID registration completes (currently falls back to voice calls for DND-registered numbers).
- `[BETA]` **Horizontal WebSocket Scaling**: In-memory `ConnectionManager` scaling across multiple server instances via Redis Pub/Sub backend broker.
- `[BETA]` **External Order Notifications**: ARQ background worker integration for real email and push notifications on order status changes (currently uses structured background logger stubs).

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
   ENV="development"
   JWT_SECRET="your-secret-key"
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
   TWOFACTOR_API_KEY="your-api-key"
   SMTP_HOST="smtp.gmail.com"
   SMTP_PORT="587"
   SMTP_USERNAME="your-email@gmail.com"
   SMTP_PASSWORD="your-app-password"
   SMTP_FROM_EMAIL="your-email@gmail.com"

   RAZORPAY_KEY_ID="your-razorpay-key-id"
   RAZORPAY_KEY_SECRET="your-razorpay-key-secret"
   RAZORPAY_WEBHOOK_SECRET="your-razorpay-webhook-secret"
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

---

## License

MIT License

Copyright (c) 2026 CodeDuo

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
