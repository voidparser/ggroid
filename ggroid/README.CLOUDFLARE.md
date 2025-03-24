# Deploying GGRoid to Cloudflare Pages

This document provides specific instructions for deploying the GGRoid application to Cloudflare Pages.

## Setup in Cloudflare Pages Dashboard

1. Log in to your Cloudflare account and go to the Pages section
2. Click "Create a project" and connect your repository
3. Configure your project with the following settings:

### Build Settings

- **Production branch**: `main` (or your preferred branch)
- **Build command**: `npm run build:cloudflare`
- **Build output directory**: `dist`
- **Node.js version**: 18 (or higher)

### Environment Variables

No special environment variables are required for basic deployment.

## Troubleshooting

### WASM Files

If you encounter issues with WebAssembly files:

1. Make sure the `_headers` file is properly deployed to set the MIME type
2. Check the Cloudflare Pages logs to see if the WASM files are correctly included

### SPA Routing

The `_redirects` file is configured to handle client-side routing. If you encounter routing issues:

1. Verify the `_redirects` file is in the build output
2. Check the format to ensure it uses spaces (not tabs) between the parts

### CORS Issues

If you face Cross-Origin issues:

1. Check the `_headers` file to ensure proper CORS headers are set
2. Update the `_headers` file in `/public` and redeploy

## Post-Deployment Verification

After deployment, verify:

1. The main application loads correctly
2. The audio functionality works, including WASM integration
3. Assets (like the R2D2 SVG) load properly

## Maintenance

For future updates:

1. Run `npm run build:cloudflare` locally to test build output
2. Check the contents of the `dist` directory before pushing changes