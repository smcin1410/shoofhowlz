# Production Deployment Guide

## Current Issue Resolution

Your Vercel frontend at `https://shoofhowlz-ffdraft.vercel.app/` is trying to connect to `localhost:4000`, which causes CORS errors in production.

## Recommended Solution: Split Deployment

### Backend Deployment (Railway - Recommended for Socket.IO)

1. **Deploy to Railway:**
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login to Railway
   railway login
   
   # Initialize project
   railway init
   
   # Deploy
   railway up
   ```

2. **Alternative: Deploy to Heroku:**
   ```bash
   # Install Heroku CLI, then:
   heroku create your-app-name
   heroku config:set NODE_ENV=production
   git push heroku main
   ```

### Frontend Deployment (Vercel)

1. **Update environment variables in Vercel:**
   - Go to your Vercel dashboard
   - Navigate to your project settings
   - Add environment variable: `VITE_SERVER_URL` = `https://your-backend-url.railway.app`

2. **Build and deploy:**
   ```bash
   cd client
   npm run build
   vercel --prod
   ```

## Quick Fix for Current Setup

If you want a quick fix while setting up proper deployment:

1. **Update the environment variable locally:**
   ```bash
   # In your Vercel dashboard, set:
   VITE_SERVER_URL=https://your-backend-domain.com
   ```

2. **Backend is already configured** to accept your Vercel domain in CORS settings.

## Environment Variables Needed

### Backend (Railway/Heroku):
- `NODE_ENV=production`
- `PORT` (automatically set by hosting provider)
- `CLIENT_URL=https://shoofhowlz-ffdraft.vercel.app` (optional, for additional CORS flexibility)

### Frontend (Vercel):
- `VITE_SERVER_URL=https://your-backend-url.railway.app`

## Files Created/Modified for Deployment

- ✅ `railway.json` - Railway deployment configuration
- ✅ `Procfile` - Heroku deployment configuration  
- ✅ `client/vercel.json` - Vercel client deployment settings
- ✅ Updated `server/index.js` - Added your Vercel domain to CORS
- ✅ Updated package.json scripts for production
- ✅ Created `.env.production` template

## Next Steps

1. Choose a backend hosting provider (Railway recommended)
2. Deploy your backend
3. Update `VITE_SERVER_URL` in Vercel with your backend URL
4. Redeploy your frontend on Vercel

Your application will then work perfectly in production with real-time Socket.IO connections!