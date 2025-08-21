# 🔧 Vercel Environment Variable Setup

## ❌ REMOVE This Variable (If It Exists):
```
REACT_APP_SERVER_URL
```
**Why:** This is for Create React App, but your project uses Vite.

## ✅ ADD/UPDATE This Variable:
```
VITE_SERVER_URL = https://fantasy-draft-server.onrender.com
```
**Why:** Vite applications use the `VITE_` prefix for environment variables.

## 📋 Step-by-Step Instructions:

1. **Go to Vercel Dashboard**
2. **Select your project** (shoofhowlz)
3. **Go to Settings** → **Environment Variables**
4. **Remove** `REACT_APP_SERVER_URL` if it exists
5. **Add** `VITE_SERVER_URL` with value: `https://fantasy-draft-server.onrender.com`
6. **Set for all environments** (Production, Preview, Development)
7. **Redeploy** your application

## 🎯 How to Verify:
After redeploying, your frontend will connect to the production backend instead of falling back to `localhost:4000`.

## 🔍 Technical Explanation:
Your code uses:
```javascript
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';
```

- `import.meta.env` is Vite's way of accessing environment variables
- `VITE_` prefix is required for Vite to expose the variable to the client
- `REACT_APP_` prefix only works with Create React App (`process.env`)

This environment variable mismatch is why your production app was trying to connect to localhost!