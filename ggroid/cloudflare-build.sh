#!/bin/bash
set -e  # Exit immediately if a command exits with a non-zero status

# Explicitly ignore any Python requirements 
# This disables the automatic Python environment setup
export PYTHON_VERSION=none
export PIP_REQUIREMENTS=none

# Use base URL as the root for Cloudflare
export CLOUDFLARE_PAGES=true

echo "Installing JavaScript dependencies..."
npm install

echo "Building for production..."
npm run build

echo "Setting up Cloudflare Pages specifics..."

# Copy and update the _headers file
cp ./public/_headers ./dist/_headers

# Copy the simple _redirects file
echo "# Single-Page Application handling
/*  /index.html  200" > ./dist/_redirects

# Make sure WASM assets are copied
if [ -d ./public/ggwave ]; then
  echo "Ensuring WASM files are in output dir..."
  
  # Check if ggwave directory exists in dist, if not create it
  if [ ! -d ./dist/ggwave ]; then
    mkdir -p ./dist/ggwave
    cp -r ./public/ggwave/* ./dist/ggwave/
  fi
fi

echo "Build complete! Output ready in ./dist directory"