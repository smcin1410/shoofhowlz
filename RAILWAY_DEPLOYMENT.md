# 🚂 Railway Deployment Instructions

## Step 1: Login to Railway
Run this command in your terminal:
```bash
railway login
```
This will open your browser to authenticate with Railway.

## Step 2: Initialize Railway Project
```bash
railway init
```
- Choose "Empty Project"
- Give it a name like "shoof-howlz-backend"

## Step 3: Deploy
```bash
railway up
```
This will deploy your entire project, but Railway will automatically detect and run the backend server.

## Step 4: Configure Environment Variables
In your Railway dashboard:
1. Go to your project
2. Click on "Variables" tab
3. Add these variables:
   - `NODE_ENV` = `production`
   - `CLIENT_URL` = `https://shoofhowlz-ffdraft.vercel.app`

## Step 5: Get Your Backend URL
After deployment, Railway will give you a URL like:
`https://your-project-name.up.railway.app`

## Step 6: Update Vercel Frontend
1. Go to your Vercel dashboard
2. Navigate to your project settings
3. Add/update environment variable:
   - `VITE_SERVER_URL` = `https://your-project-name.up.railway.app`
4. Redeploy your frontend

## Alternative: GitHub Integration
If you have this project on GitHub:
1. Go to railway.app
2. Click "New Project"
3. Choose "Deploy from GitHub repo"
4. Select your repository
5. Railway will auto-deploy from your main branch

---

**🎯 Your backend is already configured for Railway deployment with:**
- ✅ Proper start script in package.json
- ✅ CORS configured for your domain
- ✅ Railway.json configuration
- ✅ Environment variable support