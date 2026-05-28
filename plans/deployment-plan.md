# SHRUG STAFF - Deployment Plan

## Goal
Deploy the app so it's accessible from your phone and via `staff.shrug.pk`

---

## Option 1: Quick & Free — Test on Phone via Local Network

**Zero cost, zero setup.** Use while you're at home on WiFi.

### Steps
1. Find your PC's local IP:
   - Open CMD → type `ipconfig` → look for `IPv4 Address` (e.g., `192.168.1.10`)
2. In `backend/app/config.py`, add your local IP to `CORS_ORIGINS`:
   ```python
   CORS_ORIGINS: list = [
       "http://localhost:5173",
       "http://192.168.1.10:5173",  # your PC's IP
   ]
   ```
3. Restart backend
4. On your phone, open: `http://192.168.1.10:5173`
5. **Add to Home Screen** (PWA works over local network)

**Pros:** Free, instant, fully functional  
**Cons:** Only works when your PC is on

---

## Option 2: Free Cloud Hosting — Render.com

Best option for **free + custom domain**. Render has:
- **Free Web Service** (React frontend)
- **Free Web Service** (FastAPI backend)
- **Free PostgreSQL** (1GB storage)
- **Custom domain support** (so `staff.shrug.pk` works)

### Plan

```
staff.shrug.pk (your domain)
        │
        ▼ CNAME record
Render.com Custom Domain
        │
        ├── shrug-frontend (React static site)
        │       └── https://shrug-frontend.onrender.com
        │
        ├── shrug-backend (FastAPI server)
        │       └── https://shrug-backend.onrender.com
        │
        └── shrug-db (PostgreSQL)
                └── Internal Render URL
```

### Steps

#### A. Set up PostgreSQL
1. Create a free PostgreSQL DB on Render
2. Copy the "Internal Database URL"

#### B. Set up Backend
1. Push `backend/` to a separate GitHub repo
2. On Render → **New Web Service** → Connect repo
3. Settings:
   - **Name:** `shrug-backend`
   - **Runtime:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port 10000`
   - **Plan:** Free
4. Environment Variables:
   - `DATABASE_URL` = (the internal PostgreSQL URL from step A)
   - `SECRET_KEY` = (generate a random string)
   - `CORS_ORIGINS` = `["http://localhost:5173","https://shrug-frontend.onrender.com"]`

#### C. Set up Frontend
1. Update `frontend/src/api/client.ts` — change `API_BASE` to your backend URL:
   ```ts
   const API_BASE = 'https://shrug-backend.onrender.com/api';
   ```
2. Push `frontend/` to GitHub
3. On Render → **New Static Site** → Connect repo
4. Settings:
   - **Name:** `shrug-frontend`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
   - **Plan:** Free

#### D. Custom Domain
1. In your domain registrar (where you bought shrug.pk), add a CNAME record:
   ```
   staff.shrug.pk → shrug-frontend.onrender.com
   ```
2. In Render → Frontend settings → **Custom Domain** → Add `staff.shrug.pk`

---

## Option 3: Free Tunnel — Cloudflare Tunnel

If you want to host from your PC for free but with a public URL:

1. Sign up for **Cloudflare** (free)
2. Install `cloudflared` on your PC
3. Run: `cloudflared tunnel --url http://localhost:5173`
4. Get a public URL like `https://something.trycloudflare.com`
5. In Cloudflare DNS, point `staff.shrug.pk` to that tunnel

**Pros:** Free, your data stays on your PC  
**Cons:** PC must stay on

---

## Recommendation

| Option | Cost | Always On? | Custom Domain | Effort |
|--------|------|------------|---------------|--------|
| **1. Local WiFi** | Free | ❌ (PC must be on) | ❌ | ⭐ 1 min |
| **2. Render.com** | Free | ✅ (spins down after 15 min idle) | ✅ | ⭐⭐ 30 min |
| **3. Cloudflare Tunnel** | Free | ❌ (PC must be on) | ✅ | ⭐⭐ 15 min |

**If you just want to test on your phone right now:** Use **Option 1** (local WiFi) — takes 1 minute.

**If you want `staff.shrug.pk` working 24/7 for free:** Use **Option 2** (Render.com) — takes 30 minutes setup.