#!/bin/bash
echo "Installing dependencies..."
npm install

echo "Building for production..."
npm run build

echo "Setting up Cloudflare Pages specifics..."

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
fi

echo "Build complete! Output ready in ./dist directory"