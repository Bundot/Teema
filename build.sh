#!/bin/bash
# Vercel Build Script
# Injects environment variables into HTML files during build

echo "🔧 Vercel Build: Injecting environment variables..."

# Check if environment variables are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON" ]; then
    echo "❌ Missing required environment variables"
    echo "   SUPABASE_URL: ${SUPABASE_URL:0:20}..."
    echo "   SUPABASE_ANON: ${SUPABASE_ANON:0:20}..."
    exit 1
fi

echo "✅ Environment variables detected:"
echo "   SUPABASE_URL: ${SUPABASE_URL:0:20}..."
echo "   NODE_ENV: $NODE_ENV"

# Create environment injection script
cat > env-inject.js << EOF
// Environment Variables Injected by Vercel Build
window.SUPABASE_URL = '$SUPABASE_URL';
window.SUPABASE_ANON = '$SUPABASE_ANON';
window.SUPABASE_SERVICE_KEY = '$SUPABASE_SERVICE_KEY';
window.NODE_ENV = '$NODE_ENV';
window.ENABLE_CONSOLE_LOGS = '$ENABLE_CONSOLE_LOGS';

console.log('🌍 Environment variables injected by Vercel build');
console.log('🌐 SUPABASE_URL:', window.SUPABASE_URL ? '✅' : '❌');
console.log('🔑 SUPABASE_ANON:', window.SUPABASE_ANON ? '✅' : '❌');
EOF

# Replace dev-env.js with env-inject.js in HTML files
for html_file in *.html; do
    if [ -f "$html_file" ]; then
        echo "📝 Processing $html_file..."
        sed -i.tmp 's/<script src="dev-env.js"><\/script>/<script src="env-inject.js"><\/script>/g' "$html_file"
        rm -f "$html_file.tmp"
    fi
done

echo "✅ Build complete - environment variables injected"
