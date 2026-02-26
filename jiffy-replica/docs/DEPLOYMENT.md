# Deployment Guide

This guide covers deploying the Jiffy On Demand replica to production environments.

## Prerequisites

- Supabase project (already configured)
- Stripe account
- Domain name (optional)
- Git repository

## Frontend Deployment (Netlify)

### 1. Prepare for Deployment

Ensure your frontend is production-ready:

```bash
cd frontend
npm run build
```

### 2. Deploy to Netlify

#### Option A: Netlify CLI
```bash
npm install -g netlify-cli
cd frontend
netlify deploy --prod
```

#### Option B: Netlify Dashboard
1. Go to https://app.netlify.com
2. Click "Add new site" → "Import an existing project"
3. Connect your Git repository
4. Configure build settings:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/.next`
5. Configure environment variables (see below)
6. Deploy

#### Option C: Drag and Drop
1. Build locally: `npm run build`
2. Go to https://app.netlify.com
3. Drag and drop the `.next` folder

### 3. Environment Variables

Configure in Netlify Dashboard (Site settings → Environment variables):

```env
NEXT_PUBLIC_SUPABASE_URL=https://ndxauksylgoxtdoxwsjk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_API_URL=https://your-backend-domain.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_maps_key
```

### 4. netlify.toml Configuration

Create `frontend/netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

### 5. Custom Domain (Optional)

1. Go to Site settings → Domain management
2. Add custom domain
3. Configure DNS records:
   - A record: `@` → Netlify Load Balancer IP (provided in dashboard)
   - CNAME: `www` → `your-site.netlify.app`
4. Netlify automatically provisions SSL certificate

## Backend Deployment (Railway/Render)

### Option A: Railway

#### 1. Install Railway CLI
```bash
npm install -g @railway/cli
railway login
```

#### 2. Initialize Project
```bash
cd backend
railway init
```

#### 3. Configure Environment Variables
```bash
railway variables set SUPABASE_URL=https://ndxauksylgoxtdoxwsjk.supabase.co
railway variables set SUPABASE_ANON_KEY=your_key
railway variables set SUPABASE_SERVICE_KEY=your_service_key
railway variables set JWT_SECRET=your_secret
railway variables set STRIPE_SECRET_KEY=sk_live_xxx
railway variables set FRONTEND_URL=https://your-frontend-domain.com
```

#### 4. Deploy
```bash
railway up
```

### Option B: Render

#### 1. Create Web Service
1. Go to https://render.com
2. New → Web Service
3. Connect Git repository
4. Select `backend` folder

#### 2. Configure Build Settings
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Environment**: Node

#### 3. Add Environment Variables
Same as Railway configuration above.

#### 4. Deploy
Render will automatically deploy on git push.

## Database (Supabase)

Already hosted at: https://ndxauksylgoxtdoxwsjk.supabase.co

### Run Migrations

```bash
# Using Supabase CLI
supabase db push

# Or manually in Supabase SQL Editor
# Execute files in order:
# 1. database/migrations/001_initial_schema.sql
# 2. database/migrations/002_rls_policies.sql
# 3. database/migrations/003_seed_data.sql
```

### Enable Realtime

1. Go to Supabase Dashboard
2. Database → Replication
3. Enable realtime for tables:
   - bookings
   - messages
   - notifications

### Configure Storage Buckets

Buckets are created automatically via migration. Verify in Supabase Dashboard → Storage.

## DNS Configuration

### Frontend (Netlify)
```
Type: A
Name: @
Value: 75.2.60.5 (Netlify Load Balancer)

Type: CNAME
Name: www
Value: your-site.netlify.app
```

### Backend (Railway/Render)
```
Type: CNAME
Name: api
Value: your-service.railway.app (or render.com)
```

## SSL/TLS Certificates

Both Netlify and Railway/Render provide automatic SSL certificates via Let's Encrypt.

## Monitoring and Logging

### Netlify Analytics
Enable in Site settings → Analytics (available on Pro plan)

### Backend Logs
- **Railway**: `railway logs`
- **Render**: View in dashboard

### Supabase Logs
Database → Logs in Supabase Dashboard

## Performance Optimization

### Frontend
1. Enable Next.js Image Optimization (automatic)
2. Configure CDN caching headers in netlify.toml
3. Enable Netlify Edge (automatic on all plans)

### Backend
1. Enable compression middleware (already configured)
2. Implement Redis caching (optional)
3. Use connection pooling for database

### Database
1. Create indexes on frequently queried columns
2. Enable connection pooling in Supabase
3. Monitor query performance

## Backup Strategy

### Database Backups
Supabase provides automatic daily backups. Configure additional backups:
1. Supabase Dashboard → Settings → Backups
2. Enable point-in-time recovery

### Code Backups
- Git repository (primary)
- Automated GitHub backups

## Security Checklist

- [ ] Environment variables configured
- [ ] HTTPS enabled on all endpoints
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Database RLS policies enabled
- [ ] API keys secured
- [ ] Stripe webhook signatures verified
- [ ] Error messages don't expose sensitive data
- [ ] Security headers configured (helmet.js)

## Scaling

### Frontend Scaling
Netlify automatically scales based on traffic across their global CDN.

### Backend Scaling
- **Railway**: Auto-scaling available in Pro plan
- **Render**: Configure auto-scaling in dashboard

### Database Scaling
Supabase auto-scales. Monitor usage:
1. Dashboard → Settings → Usage
2. Upgrade plan if needed

## Rollback Procedure

### Frontend (Netlify)
1. Go to Site → Deploys
2. Find previous successful deployment
3. Click "Publish deploy" to rollback

Or via CLI:
```bash
netlify rollback
```

### Backend
- **Railway**: `railway rollback`
- **Render**: Rollback in dashboard

### Database
```bash
supabase db reset
# Then run specific migration
```

## Health Checks

### Backend Health Endpoint
```
GET https://api.yourdomain.com/health
```

Expected response:
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2024-02-05T12:00:00Z",
  "environment": "production"
}
```

### Monitoring Setup
1. Set up UptimeRobot or similar
2. Monitor both frontend and backend
3. Configure alerts for downtime

## Cost Estimation

### Monthly Costs (Approximate)

**Supabase**
- Free tier: $0 (up to 500MB database)
- Pro: $25/month (8GB database)

**Netlify**
- Starter: $0 (100GB bandwidth, 300 build minutes)
- Pro: $19/month (1TB bandwidth, unlimited build minutes)

**Railway/Render**
- Free tier: $0 (500 hours/month)
- Starter: $5-20/month (always-on)

**Total**: $0-65/month depending on traffic and tier

## CI/CD Pipeline

GitHub Actions automatically:
1. Runs tests on PR
2. Deploys to staging on merge to develop
3. Deploys to production on merge to main

## Post-Deployment Tasks

1. Test all critical user flows
2. Monitor error logs for 24 hours
3. Test payment processing
4. Verify email notifications
5. Check real-time features
6. Load test with realistic traffic
7. Verify mobile responsiveness
8. Test on multiple browsers

## Support

For deployment issues:
- Netlify: https://docs.netlify.com
- Railway: https://railway.app/help
- Render: https://render.com/docs
- Supabase: https://supabase.com/docs

## Troubleshooting

### Build Failures
Check build logs for:
- Missing environment variables
- Dependency issues
- Build script errors

### Runtime Errors
1. Check application logs
2. Verify environment variables
3. Test database connectivity
4. Verify API endpoints

### Performance Issues
1. Enable APM monitoring
2. Check database query performance
3. Review API response times
4. Optimize frontend bundle size
