#!/bin/bash
# Build script for deploying to Cloudflare Pages

echo "Installing dependencies..."
npm install

echo "Copying public assets..."
cp -r public/ggwave out/ggwave

echo "Building Next.js app..."
npm run build

echo "Build completed. Contents ready in ./out directory for deployment to Cloudflare Pages."