# FastBuy Deployment Guide

### Paystack + COD (GHS) — Testing Deployment

**Project:** FastBuy E-Commerce  
**Stack:** Node.js/Express backend · MySQL · Static HTML/CSS/JS frontend  
**Payment:** Paystack (GHS) + Cash on Delivery  
**Document version:** 1.0 · September 2026

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Pre-Deployment Codebase Changes](#2-pre-deployment-codebase-changes)
3. [Database Setup](#3-database-setup)
4. [Backend Deployment](#4-backend-deployment)
5. [Frontend Deployment](#5-frontend-deployment)
6. [Paystack Configuration](#6-paystack-configuration)
7. [Environment Variables Reference](#7-environment-variables-reference)
8. [Post-Deploy Testing Checklist](#8-post-deploy-testing-checklist)
9. [Troubleshooting](#9-troubleshooting)
10. [Optional Improvements (Post-Testing)](#10-optional-improvements-post-testing)

---

## 1. Architecture Overview

```
┌─────────────────┐     HTTPS API      ┌──────────────────────┐
│  Frontend       │ ─────────────────► │  Backend (Render)    │
│  (Static host)  │                    │  Express :5000       │
└────────┬────────┘                    └──────────┬───────────┘
         │                                        │
         │ Paystack Inline v2                     │ MySQL
         ▼                                        ▼
┌─────────────────┐                    ┌──────────────────────┐
│  js.paystack.co │                    │  Database (hosted)   │
└─────────────────┘                    └──────────────────────┘
```

### Payment flows

| Method | Flow |
|--------|------|
| **COD** | `POST /api/checkout` → order created immediately → confirmation page |
| **Paystack** | `POST /api/payments/paystack/initialize` → Inline popup → `onSuccess` → verify page → `GET /api/payments/paystack/verify/:ref` → order created → confirmation |

### Key API endpoints

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `POST /api/checkout` | Yes | COD orders only |
| `POST /api/payments/paystack/initialize` | Yes | Start Paystack payment |
| `GET /api/payments/paystack/verify/:reference` | Yes | Verify & create order |
| `GET /api/payments/paystack/config` | No | Public key + currency |
| `POST /api/webhooks/paystack` | Signature | Backup fulfillment |

---

## 2. Pre-Deployment Codebase Changes

These are **required or strongly recommended** code changes before deploying for testing.

### 2.1 Update production API URL

**File:** `frontend/assets/js/config.js`

Currently hardcoded:

```javascript
const defaultProduction = "https://fastbuy-iewu.onrender.com";
```

**Action:** Replace with your actual deployed backend URL, **or** set the meta tag on every HTML page (see 2.2).

---

### 2.2 Set API base URL meta tag (recommended)

**Files:** All frontend HTML pages

Each page has:

```html
<meta name="api-base-url" content="">
```

**Action:** Set to your production API URL:

```html
<meta name="api-base-url" content="https://YOUR-BACKEND.onrender.com">
```

**Affected files:**

- `frontend/index.html`
- `frontend/pages/cart.html`
- `frontend/pages/checkout.html`
- `frontend/pages/payment-callback.html`
- `frontend/pages/order-confirmation.html`
- `frontend/pages/orders.html`
- `frontend/pages/shop.html`
- `frontend/pages/product.html`
- `frontend/pages/login.html`
- `frontend/pages/register.html`
- `frontend/pages/profile.html`
- `frontend/pages/admin.html`
- `frontend/pages/about.html`
- `frontend/pages/contact.html`

---

### 2.3 Update Content-Security-Policy (CSP)

CSP is hardcoded in each HTML file. Production API calls will be **blocked** if your backend URL is not listed in `connect-src`.

**Current pattern (most pages):**

```
connect-src 'self' http://localhost:5000 https://fastbuy-iewu.onrender.com
```

**Action:** Replace `https://fastbuy-iewu.onrender.com` with your actual backend URL on **every page**.

**Checkout page** (`frontend/pages/checkout.html`) also needs Paystack domains — already includes:

```
script-src ... https://js.paystack.co
connect-src ... https://api.paystack.co https://standard.paystack.co
frame-src https://js.paystack.co https://checkout.paystack.com https://standard.paystack.co
```

**Payment callback page** (`frontend/pages/payment-callback.html`):

```
connect-src 'self' http://localhost:5000 https://YOUR-BACKEND.onrender.com https://api.paystack.co
```

> **Tip:** Consider centralizing CSP or using a build step later. For now, find-and-replace across all HTML files.

---

### 2.4 Clean up `.env.example`

**File:** `backend/.env.example`

`PAYSTACK_CALLBACK_URL` is documented but **not used** in the inline v2 flow (callback URL was removed from server initialize to prevent iframe loading issues).

**Action:** Remove or annotate as unused for inline popup flow.

---

### 2.5 Verify Paystack script version

**File:** `frontend/pages/checkout.html`

Must use Paystack Inline **v2**:

```html
<script src="https://js.paystack.co/v2/inline.js"></script>
```

Checkout JS must use `resumeTransaction(access_code)` — not the old `PaystackPop.setup()`.

---

### 2.6 No other blocking code changes required

The following are already implemented:

- Paystack service + payment controller
- Order service with payment columns
- GHS formatting (`formatGhs()`)
- COD vs Paystack checkout selector
- Payment callback with iframe breakout
- Webhook route (raw body, signature verification)

---

## 3. Database Setup

### 3.1 Run migration on hosted MySQL

**File:** `database/migrations/001_payment_paystack.sql`

Run against your **production/staging** database before deploying the new backend.

**What it does:**

- Adds to `orders`: `payment_method`, `payment_status`, `paystack_reference`, `currency`
- Creates `pending_payments` table

**How to run:**

**Option A — MySQL client:**

```sql
SOURCE /path/to/001_payment_paystack.sql;
```

**Option B — Node (from `backend/` folder, PowerShell):**

```powershell
Set-Location backend
node -e "require('dotenv').config(); const fs=require('fs'); const mysql=require('mysql2'); const sql=fs.readFileSync('../database/migrations/001_payment_paystack.sql','utf8'); const db=mysql.createConnection({host:process.env.DB_HOST,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME,port:process.env.DB_PORT||3306,multipleStatements:true}); db.query(sql,(err)=>{ if(err){console.error(err.message); process.exit(1);} console.log('Migration applied'); db.end();});"
```

> **Warning:** Re-running the `ALTER TABLE` will fail if columns already exist. Only run the `CREATE TABLE` part if `pending_payments` is missing.

### 3.2 Verify schema

After migration, confirm:

```sql
DESCRIBE orders;
DESCRIBE pending_payments;
```

Expected `orders` columns: `payment_method`, `payment_status`, `paystack_reference`, `currency`

---

## 4. Backend Deployment

### 4.1 Hosting (e.g. Render)

| Setting | Value |
|---------|-------|
| **Root directory** | `backend` |
| **Build command** | `npm install` |
| **Start command** | `npm start` (runs `node server.js`) |
| **Port** | Uses `process.env.PORT` (Render sets this automatically) |

### 4.2 Required environment variables

Set these in your hosting dashboard (see Section 7 for full list).

**Critical for production startup:**

- `NODE_ENV=production`
- `CLIENT_ORIGIN` — exact frontend URL(s)
- `JWT_SECRET` — 32+ characters
- `PAYSTACK_SECRET_KEY` — use `sk_test_...` for testing
- `PAYSTACK_PUBLIC_KEY` — use `pk_test_...` for testing
- All DB variables

If any required var is missing, `validateEnv.js` will **exit on startup**.

### 4.3 CORS configuration

**File:** `backend/app.js`

```javascript
const corsOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(",").map((o) => o.trim())
  : isProduction ? [] : defaultDevOrigins;
```

**Action:** Set `CLIENT_ORIGIN` to match your frontend exactly:

```
CLIENT_ORIGIN=https://your-frontend.netlify.app,https://www.yourdomain.com
```

Rules:

- Include `https://` (not `http://` in production)
- No trailing slash
- Comma-separate multiple origins
- Must match the browser URL exactly (www vs non-www matters)

### 4.4 Webhook route

Webhook is registered **before** `express.json()` to preserve raw body for signature verification:

```
POST /api/webhooks/paystack
```

No code change needed — register this URL in Paystack dashboard after deploy.

### 4.5 Uploads / static files

Product images are served from `backend/uploads/`. On Render:

- Ephemeral filesystem — uploads may be lost on redeploy
- For testing this is acceptable; for production consider cloud storage (S3, etc.)

---

## 5. Frontend Deployment

### 5.1 Hosting options

The frontend is static HTML/CSS/JS. Deploy the **`frontend/`** folder to:

- Netlify
- Vercel
- GitHub Pages
- Cloudflare Pages
- Render Static Site

**Live Server root** locally = `/frontend` — deploy that folder as site root.

### 5.2 SPA routing note

Pages use paths like `/pages/checkout.html`. Ensure your host serves static files correctly (no SPA rewrite that breaks `.html` paths).

### 5.3 Post-deploy verification

1. Open deployed site → DevTools → Console
2. Confirm `API_BASE_URL` points to your backend (not localhost)
3. Test login/register (CORS + API connectivity)

---

## 6. Paystack Configuration

### 6.1 Test keys (for testing deployment)

Use **test keys** from Paystack Dashboard → Settings → API Keys & Webhooks:

| Variable | Format |
|----------|--------|
| `PAYSTACK_SECRET_KEY` | `sk_test_...` |
| `PAYSTACK_PUBLIC_KEY` | `pk_test_...` |
| `PAYSTACK_CURRENCY` | `GHS` |

> Never commit real keys to git. Set only in hosting env vars.

### 6.2 Webhook URL

In Paystack Dashboard → Settings → Webhooks, set:

```
https://YOUR-BACKEND.onrender.com/api/webhooks/paystack
```

This is a **backup** — normal flow uses the verify endpoint after `onSuccess`. Webhook helps if the user closes the tab before verify completes.

### 6.3 Test card (Paystack test mode)

| Field | Value |
|-------|-------|
| Card number | `4084084084084081` |
| CVV | `408` |
| Expiry | Any future date |
| PIN | `0000` |
| OTP | `123456` (if prompted) |

### 6.4 Inline flow (no callback_url)

Server initialize **does not** send `callback_url` — this prevents Paystack from loading your verify page inside the modal iframe. Completion is handled via:

1. Paystack v2 `onSuccess` callback in `checkout.js`
2. Redirect to `payment-callback.html`
3. Server verify endpoint

---

## 7. Environment Variables Reference

### Backend — complete list

| Variable | Required | Example | Notes |
|----------|----------|---------|-------|
| `PORT` | Auto | `5000` | Set by Render |
| `NODE_ENV` | Yes (prod) | `production` | Enables strict validation |
| `DB_HOST` | Yes | `xxx.mysql.database.azure.com` | |
| `DB_PORT` | No | `3306` | Default 3306 |
| `DB_USER` | Yes | `fastbuy_user` | |
| `DB_PASSWORD` | Yes | `***` | |
| `DB_NAME` | Yes | `fastbuy_db` | |
| `JWT_SECRET` | Yes | 32+ random chars | Weak values rejected |
| `CLIENT_ORIGIN` | Yes (prod) | `https://site.com` | Comma-separated |
| `PAYSTACK_SECRET_KEY` | Yes (prod) | `sk_test_...` | |
| `PAYSTACK_PUBLIC_KEY` | Yes (prod) | `pk_test_...` | |
| `PAYSTACK_CURRENCY` | No | `GHS` | Defaults to GHS |
| `EMAIL_USER` | Optional | `you@gmail.com` | Order emails |
| `EMAIL_PASS` | Optional | app password | |
| `CONTACT_EMAIL` | Optional | | Contact form inbox |

### Example production env (Render dashboard)

```
NODE_ENV=production
PORT=5000

DB_HOST=your-db-host
DB_PORT=3306
DB_USER=your-user
DB_PASSWORD=your-password
DB_NAME=fastbuy_db

JWT_SECRET=your-long-random-secret-at-least-32-characters

CLIENT_ORIGIN=https://your-frontend.netlify.app

PAYSTACK_SECRET_KEY=sk_test_xxxxxxxx
PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxx
PAYSTACK_CURRENCY=GHS

EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

---

## 8. Post-Deploy Testing Checklist

### 8.1 Infrastructure

- [ ] Backend starts without env validation errors
- [ ] `GET https://YOUR-BACKEND/` returns "FastBuy API is running"
- [ ] `GET https://YOUR-BACKEND/api/payments/paystack/config` returns `{ publicKey, currency: "GHS" }`
- [ ] Frontend loads without console CSP errors
- [ ] Login/register works (CORS OK)

### 8.2 COD flow

- [ ] Add items to cart
- [ ] Checkout → select **Cash on Delivery**
- [ ] Order confirmation shows order ID and total in GH₵
- [ ] Admin panel shows order with Payment: COD, Status: Unpaid
- [ ] Cart is cleared

### 8.3 Paystack flow

- [ ] Checkout → select **Paystack**
- [ ] Paystack popup opens (not infinite spinner)
- [ ] Complete test card payment
- [ ] Redirected to verify page, then order confirmation
- [ ] Order shows Payment: Paystack, Status: Paid
- [ ] Cart is cleared
- [ ] `pending_payments` row status = `completed` in DB

### 8.4 Edge cases

- [ ] Cancel Paystack popup → checkout button re-enables
- [ ] Empty cart → checkout disabled
- [ ] Insufficient stock → clear error message
- [ ] Refresh order confirmation page → order loads correctly

---

## 9. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| API calls blocked in browser | CSP missing backend URL | Update `connect-src` in all HTML files |
| CORS error in console | `CLIENT_ORIGIN` mismatch | Match exact frontend URL in backend env |
| Paystack popup infinite spinner | Old v1 API or callback_url conflict | Use v2 + `resumeTransaction`; no callback_url on init |
| "Paystack is not configured" | Missing keys in env | Set `PAYSTACK_SECRET_KEY` and `PAYSTACK_PUBLIC_KEY` |
| Verify returns 404 | Migration not run | Run `001_payment_paystack.sql` |
| Verify returns 403 | Wrong user / reference mismatch | Log in as same user who started payment |
| Verify returns 409 | Cart changed after initialize | Re-checkout with current cart |
| "Payment was not successful" | Paystack not confirmed yet | Retry verify after 2–3 seconds |
| Backend won't start in prod | Env validation failed | Check logs for missing/weak vars |
| Images broken after redeploy | Ephemeral uploads on Render | Re-upload products or use persistent storage |

### Debug commands

**Check Paystack config:**

```
GET /api/payments/paystack/config
```

**Check pending payment (MySQL):**

```sql
SELECT * FROM pending_payments ORDER BY created_at DESC LIMIT 5;
```

**Check order payment fields:**

```sql
SELECT id, payment_method, payment_status, paystack_reference, currency, total_price
FROM orders ORDER BY created_at DESC LIMIT 5;
```

---

## 10. Optional Improvements (Post-Testing)

Not required for initial testing, but recommended before public launch:

| Item | Priority | Description |
|------|----------|-------------|
| Verify retry logic | Medium | Retry verify 2–3 times if Paystack status still pending |
| Hide Paystack when unconfigured | Low | Disable radio if `publicKey` is empty |
| Rate limit payment routes | Medium | Protect initialize/verify from abuse |
| Pending payment cleanup | Low | Expire abandoned `pending_payments` rows |
| Persistent file storage | High (prod) | Move uploads off ephemeral disk |
| httpOnly JWT cookies | High (prod) | Replace localStorage tokens |
| Live Paystack keys | When ready | Switch `sk_live_` / `pk_live_` for real payments |
| Centralize CSP/config | Low | Single config file instead of per-page meta tags |

---

## Deployment Order Summary

```
1. Update codebase (config.js, CSP, api-base-url meta tags)
2. Run DB migration on hosted MySQL
3. Set backend env vars on Render
4. Deploy backend → verify startup + /api/payments/paystack/config
5. Deploy frontend
6. Register Paystack webhook URL
7. Run full COD + Paystack test checklist on live URLs
```

---

**Document prepared for:** FastBuy · Paystack + COD (GHS) testing deployment  
**Backend default URL in codebase:** `https://fastbuy-iewu.onrender.com`  
**Replace all placeholder URLs with your actual deployment URLs before going live.**

### Export to PDF

1. Open this file in VS Code or paste into Google Docs / Word
2. Use **File → Print → Save as PDF**, or your editor's Markdown PDF export extension
