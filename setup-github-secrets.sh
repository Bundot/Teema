#!/bin/bash
# GitHub Actions Secrets Setup Script for Hostinger Deployment
# This script reads your local .env.production file and securely uploads 
# the secrets to your GitHub repository using the GitHub CLI (gh).

echo "🔒 GitHub Actions Secrets Setup"
echo "==============================="

# 1. Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed."
    echo "👉 Please install it first: brew install gh"
    echo "👉 Then authenticate: gh auth login"
    exit 1
fi

# 2. Check auth status
echo "🔍 Checking GitHub authentication..."
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub."
    echo "👉 Please run: gh auth login"
    exit 1
fi

# 3. Load variables from .env.production
if [ ! -f ".env.production" ]; then
    echo "❌ .env.production file not found in the current directory!"
    exit 1
fi

echo "✅ Found .env.production. Reading Supabase credentials..."
export $(grep -v '^#' .env.production | xargs)

# Verify required Supabase variables exist
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
    echo "❌ Missing required Supabase variables in .env.production"
    exit 1
fi

# 4. Prompt for Hostinger FTP Credentials
echo ""
echo "🌐 Please enter your Hostinger FTP Credentials"
echo "   (You can find these in hPanel -> Files -> FTP Accounts)"
echo ""

read -p "FTP Server (e.g., ftp.hostinger.com or IP): " FTP_SERVER
if [ -z "$FTP_SERVER" ]; then echo "❌ FTP Server required"; exit 1; fi

read -p "FTP Username: " FTP_USERNAME
if [ -z "$FTP_USERNAME" ]; then echo "❌ FTP Username required"; exit 1; fi

read -s -p "FTP Password: " FTP_PASSWORD
echo ""
if [ -z "$FTP_PASSWORD" ]; then echo "❌ FTP Password required"; exit 1; fi

# 5. Upload Secrets to GitHub
echo ""
echo "🚀 Uploading secrets to GitHub repository..."

# Helper function to set secret
set_secret() {
    local key=$1
    local value=$2
    echo -n "   Setting $key... "
    if echo "$value" | gh secret set "$key" 2>/dev/null; then
        echo "✅"
    else
        echo "❌ (Failed to set)"
    fi
}

set_secret "SUPABASE_URL" "$SUPABASE_URL"
set_secret "SUPABASE_ANON" "$SUPABASE_ANON"
set_secret "SUPABASE_SERVICE_KEY" "$SUPABASE_SERVICE_KEY"
set_secret "ENABLE_CONSOLE_LOGS" "false" # Set to false for true production by default
set_secret "FTP_SERVER" "$FTP_SERVER"
set_secret "FTP_USERNAME" "$FTP_USERNAME"
set_secret "FTP_PASSWORD" "$FTP_PASSWORD"

echo ""
echo "✨ All secrets have been configured in your GitHub repository!"
echo "👉 Next step: push your code to the 'main' branch to trigger the deployment."
echo "   git add ."
echo "   git commit -m \"Configure GitHub Actions for Hostinger deployment\""
echo "   git push origin main"
