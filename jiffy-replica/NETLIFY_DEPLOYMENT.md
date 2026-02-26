# Netlify Deployment Guide - Jiffy Frontend

This guide will help you deploy the Jiffy frontend to Netlify.

## Prerequisites

- GitHub account with your code pushed
- Netlify account (free tier is sufficient)
- Your repository: `BridgeWork` on GitHub

## Step-by-Step Deployment

### 1. Sign Up / Log In to Netlify

1. Go to [https://www.netlify.com](https://www.netlify.com)
2. Click "Sign up" or "Log in"
3. Choose "Sign up with GitHub" for easier integration

### 2. Import Your Project

1. Click **"Add new site"** → **"Import an existing project"**
2. Choose **"Deploy with GitHub"**
3. Authorize Netlify to access your GitHub repositories
4. Select your repository: `BridgeWork`

### 3. Configure Build Settings

Netlify should auto-detect Next.js, but verify these settings:

**Base directory:**
```
frontend
```

**Build command:**
```
npm run build
```

**Publish directory:**
```
.next
```

**Environment variables (optional for now):**
- You can skip this for now since we're deploying frontend only
- Later, you'll add `NEXT_PUBLIC_API_URL` when backend is ready

### 4. Deploy

1. Click **"Deploy site"**
2. Netlify will:
   - Install dependencies (`npm install`)
   - Build your Next.js app (`npm run build`)
   - Deploy to a temporary URL (e.g., `random-name-123.netlify.app`)

### 5. Monitor Deployment

- Watch the deploy logs in real-time
- Build typically takes 2-5 minutes
- You'll see "Site is live" when complete

### 6. Custom Domain (Optional)

1. Go to **Site settings** → **Domain management**
2. Click **"Add custom domain"**
3. Follow instructions to:
   - Add your domain
   - Configure DNS settings
   - Enable HTTPS (automatic with Netlify)

## Post-Deployment

### Your Live URLs

- **Temporary URL:** `https://[random-name].netlify.app`
- **Custom domain:** (if configured)

### Test Your Site

Visit these pages to verify deployment:
- `/` - Homepage with hero, stats, sections
- `/services` - Services page with categories
- `/help` - Help Center (no header/footer)
- `/login` - Login page (navbar only, no footer)

### Expected Behavior (Frontend Only)

✅ **Working:**
- All UI pages render correctly
- Navigation works
- Styling (Tailwind CSS) applied
- Images load
- Client-side routing

⚠️ **Not Working (Expected):**
- Login functionality (needs backend API)
- Sign up functionality (needs backend API)
- Data fetching from backend
- Authentication features

## Troubleshooting

### Build Fails

**Error: "Module not found"**
- Solution: Ensure all dependencies are in `package.json`
- Run `npm install` locally to verify

**Error: "Build exceeded time limit"**
- Solution: Check for infinite loops or heavy computations
- Optimize build process

### Site Loads but Looks Broken

**Missing styles:**
- Check Tailwind CSS configuration
- Verify `globals.css` imports

**404 errors:**
- Check file paths are correct
- Ensure all imports use correct casing

### Environment Variables

If you need to add environment variables later:

1. Go to **Site settings** → **Environment variables**
2. Add variables:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-api.com
   ```
3. Redeploy the site

## Continuous Deployment

Netlify automatically redeploys when you push to your main branch:

1. Make changes locally
2. Commit: `git commit -m "Update feature"`
3. Push: `git push origin main`
4. Netlify auto-deploys (takes 2-5 minutes)

## Netlify Configuration File

Your `frontend/netlify.toml` is already configured with:
- Build settings
- Security headers
- Cache optimization
- Next.js plugin

## Next Steps

### When Backend is Ready:

1. **Deploy backend** (e.g., Railway, Render, Heroku)
2. **Add environment variables** in Netlify:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-url.com/api
   ```
3. **Update API calls** in frontend to use `process.env.NEXT_PUBLIC_API_URL`
4. **Redeploy** frontend

### Recommended Netlify Settings:

- **Branch deploys:** Enable for `main` branch
- **Deploy previews:** Enable for pull requests
- **Build hooks:** Set up for manual deployments
- **Forms:** Enable if you add contact forms later

## Support

- **Netlify Docs:** https://docs.netlify.com
- **Next.js on Netlify:** https://docs.netlify.com/integrations/frameworks/next-js/
- **Community:** https://answers.netlify.com

## Summary

Your frontend is now live and accessible worldwide! 🎉

The site will work perfectly for UI/UX demonstration, but authentication and data features will need the backend deployed to function fully.
