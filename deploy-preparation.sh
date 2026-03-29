#!/bin/bash
# Hostinger Deployment Preparation Script
# This script prepares your files for upload to Hostinger by injecting environment variables.

echo "🚀 Preparing files for Hostinger deployment..."

# 1. Create a clean deploy directory
DEPLOY_DIR="deploy"
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

# 2. Load environment variables from .env.production
if [ -f ".env.production" ]; then
    echo "✅ Loading production environment variables from .env.production"
    export $(grep -v '^#' .env.production | xargs)
else
    echo "❌ .env.production not found! Please ensure it exists."
    exit 1
fi

# 3. Create env-inject.js
cat > "$DEPLOY_DIR/env-inject.js" << EOF
// Environment Variables for Hostinger Deployment
window.SUPABASE_URL = '$SUPABASE_URL';
window.SUPABASE_ANON = '$SUPABASE_ANON';
window.SUPABASE_SERVICE_KEY = '$SUPABASE_SERVICE_KEY';
window.NODE_ENV = 'production';
window.ENABLE_CONSOLE_LOGS = '$ENABLE_CONSOLE_LOGS';

console.log('🌍 Environment variables injected for Hostinger');
EOF

# 4. Copy and process HTML files
for html_file in *.html; do
    if [ -f "$html_file" ]; then
        echo "📝 Processing $html_file..."
        # Replace dev-env.js with env-inject.js and save to deploy dir
        sed 's/dev-env\.js/env-inject.js/g' "$html_file" > "$DEPLOY_DIR/$html_file"
    fi
done

# 5. Copy other necessary assets
echo "📂 Copying assets and styles..."
cp -r assets "$DEPLOY_DIR/" 2>/dev/null
cp *.css "$DEPLOY_DIR/"
cp script.js "$DEPLOY_DIR/"
cp secure-storage.js "$DEPLOY_DIR/"
cp config-loader.js "$DEPLOY_DIR/"
cp security-validator.js "$DEPLOY_DIR/"

# Create config directory and supabase.js if needed by any scripts
mkdir -p "$DEPLOY_DIR/config"
cp "$DEPLOY_DIR/env-inject.js" "$DEPLOY_DIR/config/supabase.js"

# 6. Create .htaccess for Hostinger (Apache/LiteSpeed)
echo "📝 Creating .htaccess for security and HTTPS..."
cat > "$DEPLOY_DIR/.htaccess" << EOF
# Force HTTPS
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Security Headers
<IfModule mod_headers.c>
    Header set Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://qnuznpihinvgzomddivo.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self';"
    Header set Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
    Header set X-Frame-Options "DENY"
    Header set X-Content-Type-Options "nosniff"
    Header set X-XSS-Protection "1; mode=block"
    Header set Referrer-Policy "strict-origin-when-cross-origin"
    Header set Permissions-Policy "geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=()"
</IfModule>

# Custom Error Pages (optional)
# ErrorDocument 404 /index.html
EOF

echo "✨ Preparation complete!"
echo "📂 Your files are ready in the '$DEPLOY_DIR/' folder."
echo "👉 Upload the CONTENTS of '$DEPLOY_DIR/' to your Hostinger 'public_html' directory."
echo "   (Make sure to include the hidden .htaccess file!)"
