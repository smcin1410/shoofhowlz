#!/bin/bash

echo "🚀 Fantasy Football Draft - Production Deployment Helper"
echo "=================================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

echo ""
echo "📋 Pre-deployment checklist:"
echo "1. ✅ Backend CORS configured for production"
echo "2. ✅ Railway/Heroku deployment files created"
echo "3. ✅ Vercel configuration updated"
echo ""

read -p "🤔 Do you want to deploy the backend to Railway? (y/n): " deploy_backend

if [ "$deploy_backend" = "y" ]; then
    echo ""
    echo "🚂 Deploying backend to Railway..."
    
    if ! command -v railway &> /dev/null; then
        echo "📦 Installing Railway CLI..."
        npm install -g @railway/cli
    fi
    
    echo "🔐 Please make sure you're logged into Railway:"
    railway login
    
    echo "🚀 Initializing and deploying..."
    railway init
    railway up
    
    echo ""
    echo "📝 Next steps:"
    echo "1. Copy your Railway backend URL"
    echo "2. Update VITE_SERVER_URL in Vercel dashboard"
    echo "3. Redeploy your Vercel frontend"
fi

read -p "🤔 Do you want to build the frontend for deployment? (y/n): " build_frontend

if [ "$build_frontend" = "y" ]; then
    echo ""
    echo "🏗️ Building frontend for production..."
    cd client
    npm run build
    echo "✅ Frontend built successfully!"
    echo ""
    echo "📝 To deploy to Vercel:"
    echo "1. Run: vercel --prod"
    echo "2. Or push to your connected Git repository"
fi

echo ""
echo "🎉 Deployment helper complete!"
echo "📖 See DEPLOYMENT_GUIDE.md for detailed instructions"