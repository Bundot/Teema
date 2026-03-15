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
        # Create backup
        cp "$html_file" "$html_file.backup"
        
        # Replace dev-env.js references with env-inject.js
        sed -i.tmp \
            -e 's|<script src="dev-env.js"></script>|<script src="env-inject.js"></script>|g' \
            -e 's|<script src="dev-env.js" ></script>|<script src="env-inject.js"></script>|g' \
            -e 's|<script src="dev-env.js"[^>]*></script>|<script src="env-inject.js"></script>|g' \
            "$html_file"
        
        # Verify replacement worked
        if grep -q "env-inject.js" "$html_file"; then
            echo "✅ Successfully replaced dev-env.js in $html_file"
        else
            echo "⚠️ No dev-env.js found in $html_file (or replacement failed)"
            # Restore from backup if replacement failed
            if [ -f "$html_file.backup" ]; then
                mv "$html_file.backup" "$html_file"
            fi
        fi
        
        # Clean up temporary files
        rm -f "$html_file.tmp" "$html_file.backup"
    fi
done

echo "✅ Build complete - environment variables injected"
