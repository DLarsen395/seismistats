#!/bin/sh
# Runtime environment variable injection for SeismiStats frontend
# Creates a runtime-config.js file that's loaded before the app

set -e

CONFIG_FILE="/usr/share/nginx/html/runtime-config.js"

echo "🔧 Generating runtime configuration..."

# Create runtime config with environment variables
cat > "$CONFIG_FILE" << EOF
// Runtime configuration - generated at container startup
// This file is loaded before the React app and sets window.__RUNTIME_CONFIG__
window.__RUNTIME_CONFIG__ = {
  VITE_API_URL: "${VITE_API_URL:-http://localhost:3000}",
  VITE_USE_API: ${VITE_USE_API:-false},
  VITE_PUBLIC_MODE: ${VITE_PUBLIC_MODE:-false}
};
console.log('[SeismiStats] Runtime config loaded:', window.__RUNTIME_CONFIG__);
EOF

echo "   VITE_API_URL=${VITE_API_URL:-http://localhost:3000}"
echo "   VITE_USE_API=${VITE_USE_API:-false}"
echo "   VITE_PUBLIC_MODE=${VITE_PUBLIC_MODE:-false}"
echo "✅ Runtime configuration generated!"

# Start nginx
exec nginx -g 'daemon off;'
