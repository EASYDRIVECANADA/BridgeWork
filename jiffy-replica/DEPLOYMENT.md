# Backend Deployment Guide

This guide will help you deploy the BridgeWork backend to Render.com or Railway.app.

---

## 🚀 Option 1: Deploy to Render.com (Recommended)

### Step 1: Push Your Code to GitHub

Make sure your backend code is pushed to GitHub:

```bash
cd backend
git add .
git commit -m "Prepare backend for deployment"
git push origin main
```

### Step 2: Create Render Account

1. Go to https://render.com
2. Sign up with your GitHub account
3. Authorize Render to access your repositories

### Step 3: Create New Web Service

1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository
3. Select your repository: `BridgeWork` or `jiffy-replica`
4. Configure the service:

**Settings:**
- **Name:** `bridgework-backend` (or any name you prefer)
- **Region:** Choose closest to your users
- **Branch:** `main`
- **Root Directory:** `backend` (IMPORTANT!)
- **Runtime:** `Node`
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Instance Type:** `Free`

### Step 4: Add Environment Variables

Click **"Advanced"** → **"Add Environment Variable"** and add these:

```
NODE_ENV=production
PORT=5000
SUPABASE_URL=https://ndxauksylgoxtdoxwsjk.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5keGF1a3N5bGdveHRkb3h3c2prIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNTM1ODAsImV4cCI6MjA4NTgyOTU4MH0.gb-_5w7_yCqTMPImgc2gqP4X1snOBaAtLF_HjJjWu28
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5keGF1a3N5bGdveHRkb3h3c2prIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDI1MzU4MCwiZXhwIjoyMDg1ODI5NTgwfQ.hQCKTOBxqPiKdXfzJqWYYVJNqzYGWmZzQJDYqOxJCqI
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
STRIPE_SECRET_KEY=your_stripe_secret_key
FRONTEND_URL=https://your-netlify-site.netlify.app
```

**IMPORTANT:** Replace `FRONTEND_URL` with your actual Netlify URL!

### Step 5: Deploy

1. Click **"Create Web Service"**
2. Wait for deployment (5-10 minutes)
3. Once deployed, you'll get a URL like: `https://bridgework-backend.onrender.com`

### Step 6: Update Frontend Environment Variables

In **Netlify Dashboard** → **Site settings** → **Environment variables**, update:

```
NEXT_PUBLIC_API_URL=https://bridgework-backend.onrender.com
NEXT_PUBLIC_SOCKET_URL=https://bridgework-backend.onrender.com
```

Then **redeploy** your Netlify site.

---

## 🚂 Option 2: Deploy to Railway.app

### Step 1: Create Railway Account

1. Go to https://railway.app
2. Sign up with your GitHub account
3. Authorize Railway to access your repositories

### Step 2: Create New Project

1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose your repository
4. Railway will auto-detect it's a Node.js app

### Step 3: Configure Root Directory

1. Click on your service
2. Go to **Settings** tab
3. Under **"Build"**, set:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`

### Step 4: Add Environment Variables

1. Go to **Variables** tab
2. Click **"New Variable"** and add:

```
NODE_ENV=production
PORT=5000
SUPABASE_URL=https://ndxauksylgoxtdoxwsjk.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5keGF1a3N5bGdveHRkb3h3c2prIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNTM1ODAsImV4cCI6MjA4NTgyOTU4MH0.gb-_5w7_yCqTMPImgc2gqP4X1snOBaAtLF_HjJjWu28
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5keGF1a3N5bGdveHRkb3h3c2prIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDI1MzU4MCwiZXhwIjoyMDg1ODI5NTgwfQ.hQCKTOBxqPiKdXfzJqWYYVJNqzYGWmZzQJDYqOxJCqI
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
STRIPE_SECRET_KEY=your_stripe_secret_key
FRONTEND_URL=https://your-netlify-site.netlify.app
```

### Step 5: Generate Domain

1. Go to **Settings** tab
2. Under **"Networking"**, click **"Generate Domain"**
3. You'll get a URL like: `https://bridgework-backend-production.up.railway.app`

### Step 6: Deploy

Railway will automatically deploy. Wait 5-10 minutes.

### Step 7: Update Frontend Environment Variables

In **Netlify Dashboard**, update:

```
NEXT_PUBLIC_API_URL=https://bridgework-backend-production.up.railway.app
NEXT_PUBLIC_SOCKET_URL=https://bridgework-backend-production.up.railway.app
```

Then **redeploy** your Netlify site.

---

## ✅ Testing Your Deployment

After deployment, test these endpoints:

1. **Health Check:** `https://your-backend-url.com/health`
2. **API Status:** `https://your-backend-url.com/api`

You should see JSON responses confirming the server is running.

---

## 🔧 Troubleshooting

### Issue: "Application failed to respond"
- Check logs in Render/Railway dashboard
- Verify all environment variables are set correctly
- Make sure `PORT` is set to `5000` or use `process.env.PORT`

### Issue: "CORS errors"
- Update `FRONTEND_URL` in backend environment variables
- Make sure it matches your Netlify URL exactly (no trailing slash)

### Issue: "Database connection failed"
- Verify Supabase credentials are correct
- Check if Supabase project is active

---

## 📝 Important Notes

1. **Free Tier Limitations:**
   - Render: Service sleeps after 15 min of inactivity (cold starts)
   - Railway: 500 hours/month free, then $5/month

2. **CORS Configuration:**
   - Your backend CORS is already configured to accept your frontend URL
   - Make sure `FRONTEND_URL` matches your Netlify deployment

3. **Environment Variables:**
   - Never commit `.env` files to GitHub
   - Always use platform-specific environment variable settings

---

## 🎉 Success!

Once deployed, your full-stack app will be live:
- **Frontend:** Netlify (auto-deploys from GitHub)
- **Backend:** Render/Railway (auto-deploys from GitHub)
- **Database:** Supabase (already hosted)

Any push to GitHub will trigger automatic redeployment! 🚀
