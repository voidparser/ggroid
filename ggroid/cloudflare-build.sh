#!/bin/bash
set -e  # Exit immediately if a command exits with a non-zero status

# Explicitly ignore any Python requirements
# This disables the automatic Python environment setup
export PYTHON_VERSION=none
export PIP_REQUIREMENTS=none

# Set Cloudflare Pages flag to adjust base path
export CLOUDFLARE_PAGES=true

echo "Installing JavaScript dependencies..."
npm install

echo "Building for production..."
npm run build

echo "Setting up Cloudflare Pages specifics..."

# Create a proper _headers file with MIME types
echo "# Headers for all files
/*
  Content-Type: text/html

# CSS files
*.css
  Content-Type: text/css

# JavaScript files
*.js
  Content-Type: application/javascript

# WASM files
*.wasm
  Content-Type: application/wasm

# SVG files
*.svg
  Content-Type: image/svg+xml

# JSON files
*.json
  Content-Type: application/json

# ICO files
*.ico
  Content-Type: image/x-icon" > ./dist/_headers

# Make sure WASM assets are copied
if [ -d ./public/ggwave ]; then
  echo "Ensuring WASM files are in output dir..."
  
  # Check if ggwave directory exists in dist, if not create it
  if [ ! -d ./dist/ggwave ]; then
    mkdir -p ./dist/ggwave
    cp -r ./public/ggwave/* ./dist/ggwave/
  fi
fi

# Since we're using root path, no need for redirects
echo "# Handle SPA routing
/*  /index.html  200" > ./dist/_redirects

echo "Build complete! Output ready in ./dist directory"