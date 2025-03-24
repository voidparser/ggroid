#!/bin/bash
set -e  # Exit immediately if a command exits with a non-zero status

echo "Installing dependencies..."
npm install

echo "Building for production..."
npm run build

echo "Setting up Cloudflare Pages specifics..."

# Create dist directory if it doesn't exist (unlikely but just in case)
mkdir -p ./dist

# Ensure _redirects is in the output
if [ ! -f ./dist/_redirects ]; then
  echo "Adding _redirects file to output dir..."
  cp ./public/_redirects ./dist/ 2>/dev/null || echo "/* /index.html 200" > ./dist/_redirects
fi

# Copy special headers file if it exists
if [ -f ./public/_headers ]; then
  echo "Copying _headers file to output dir..."
  cp ./public/_headers ./dist/
fi

# Make sure WASM assets are copied
if [ -d ./public/ggwave ]; then
  echo "Ensuring WASM files are in output dir..."
  mkdir -p ./dist/ggwave
  cp -r ./public/ggwave/* ./dist/ggwave/
  
  # Set proper MIME type for WASM files
  echo "Setting correct MIME type for WASM files in _headers..."
  grep -q "/ggwave/" ./dist/_headers || echo -e "\n# Headers for WASM files\n/ggwave/*\n  Content-Type: application/wasm" >> ./dist/_headers
fi

echo "Build complete! Output ready in ./dist directory"