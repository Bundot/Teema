#!/bin/bash
# Production Deployment Script
# Sets up environment for production deployment

echo "🚀 Setting up production deployment..."

# Check if production environment file exists
if [ ! -f ".env.production" ]; then
    echo "❌ .env.production not found. Please create it first."
    exit 1
fi

# Copy production environment to .env (for deployment)
echo "📋 Copying production environment variables..."
cp .env.production .env

# Verify environment variables are set
source .env

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON" ]; then
    echo "❌ Missing required environment variables in .env.production"
    exit 1
fi

echo "✅ Environment variables verified:"
echo "   SUPABASE_URL: ${SUPABASE_URL:0:20}..."
echo "   SUPABASE_ANON: ${SUPABASE_ANON:0:20}..."
echo "   NODE_ENV: $NODE_ENV"

# Check for hardcoded credentials in HTML files
echo "🔍 Checking for hardcoded credentials..."
if grep -r "https://qnuznpihinvgzomddivo.supabase.co" --include="*.html" .; then
    echo "❌ Found hardcoded credentials in HTML files!"
    echo "   Please remove all hardcoded Supabase URLs and keys"
    exit 1
fi

if grep -r "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" --include="*.html" .; then
    echo "❌ Found hardcoded Supabase keys in HTML files!"
    echo "   Please remove all hardcoded Supabase keys"
    exit 1
fi

echo "✅ No hardcoded credentials found in HTML files"

# Check for debug code
if grep -r "IMMEDIATE DEBUG\|debugDiv\|console\.log.*debug" --include="*.html" .; then
    echo "⚠️ Found debug code in HTML files"
    echo "   Consider removing debug code for production"
fi

# Run git status to see what will be committed
echo "📋 Git status:"
git status --porcelain

echo ""
echo "🎯 Ready for production deployment!"
echo "   1. Review git status above"
echo "   2. Commit changes: git add . && git commit -m 'Production ready - security fixes applied'"
echo "   3. Push to deploy: git push origin main"
echo "   4. Set environment variables in Vercel dashboard"
echo ""
echo "📚 Environment variables for Vercel:"
echo "   SUPABASE_URL=$SUPABASE_URL"
echo "   SUPABASE_ANON=$SUPABASE_ANON"
echo "   SUPABASE_SERVICE_KEY=$SUPABASE_SERVICE_KEY"
echo "   NODE_ENV=production"
echo "   ENABLE_CONSOLE_LOGS=false"
