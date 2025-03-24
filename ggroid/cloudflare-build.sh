#!/bin/bash
set -e  # Exit immediately if a command exits with a non-zero status

echo "Installing JavaScript dependencies..."
npm install

echo "Building for production..."
npm run build

echo "Setting up Cloudflare Pages specifics..."

# Create a very explicit _headers file to ensure proper MIME types
cat > ./dist/_headers << 'EOL'
# Headers for all routes
/*
  Cross-Origin-Embedder-Policy: require-corp
  Cross-Origin-Opener-Policy: same-origin

# JavaScript files
/assets/*.js
  Content-Type: application/javascript

# CSS files
/assets/*.css
  Content-Type: text/css

# WASM files
/ggwave/*.wasm
  Content-Type: application/wasm

# SVG files
/*.svg
  Content-Type: image/svg+xml
EOL

# Create a very simple _redirects file
echo "/*  /index.html  200" > ./dist/_redirects

# Make sure WASM assets are copied
if [ -d ./public/ggwave ]; then
  echo "Ensuring WASM files are in output dir..."
  mkdir -p ./dist/ggwave
  cp -r ./public/ggwave/* ./dist/ggwave/
fi

echo "Build complete! Output ready in ./dist directory"