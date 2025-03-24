#!/bin/bash
set -e  # Exit immediately if a command exits with a non-zero status

# Explicitly ignore any Python requirements
# This disables the automatic Python environment setup
export PYTHON_VERSION=none
export PIP_REQUIREMENTS=none

echo "Installing JavaScript dependencies..."
npm install

echo "Building for production..."
npm run build

echo "Setting up Cloudflare Pages specifics..."

# Ensure _redirects is in the output
if [ ! -f ./dist/_redirects ]; then
  echo "Adding _redirects file to output dir..."
  cp ./public/_redirects ./dist/ 2>/dev/null || echo "/ /ggroid/ 301
/ggroid/* /ggroid/index.html 200
/ggroid/index.html /ggroid/index.html 200
/* /ggroid/index.html 200" > ./dist/_redirects
fi

# Copy special headers file if it exists
if [ -f ./public/_headers ]; then
  echo "Copying _headers file to output dir..."
  cp ./public/_headers ./dist/
fi

# Make sure WASM assets are copied
if [ -d ./public/ggwave ]; then
  echo "Ensuring WASM files are in output dir..."
  
  # Check if ggwave directory exists in dist, if not create it
  if [ ! -d ./dist/ggwave ]; then
    mkdir -p ./dist/ggwave
    cp -r ./public/ggwave/* ./dist/ggwave/
  fi
  
  # Set proper MIME type for WASM files
  echo "Setting correct MIME type for WASM files in _headers..."
  grep -q "/ggroid/ggwave/" ./dist/_headers || echo -e "\n# Headers for WASM files\n/ggroid/ggwave/*\n  Content-Type: application/wasm" >> ./dist/_headers
fi

echo "Build complete! Output ready in ./dist directory"