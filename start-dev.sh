#!/bin/bash
# Development Server with Environment Variables
# This script starts a local server with environment variables loaded

echo "🚀 Starting Teema Development Server..."

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found. Please create it first."
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

echo "✅ Environment variables loaded:"
echo "   SUPABASE_URL: ${SUPABASE_URL:0:20}..."
echo "   NODE_ENV: $NODE_ENV"

# Start local server with environment variables
if command -v python3 &> /dev/null; then
    echo "🌐 Starting Python server on http://localhost:8080"
    python3 -m http.server 8080
elif command -v node &> /dev/null; then
    echo "🌐 Starting Node.js server on http://localhost:8080"
    npx http-server -p 8080 -c-1
else
    echo "❌ Neither Python3 nor Node.js found. Please install one of them."
    exit 1
fi
