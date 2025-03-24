# Deploying GGRoid to Cloudflare Pages

This document provides specific instructions for deploying the GGRoid application to Cloudflare Pages.

## Setup in Cloudflare Pages Dashboard

1. Log in to your Cloudflare account and go to the Pages section
2. Click "Create a project" and connect your repository
3. Configure your project with the following settings:

### Build Settings

- **Production branch**: `main` (or your preferred branch)
- **Build command**: `npm run build:cloudflare`
- **Output directory**: `dist`
- **Node.js version**: 18 (or higher)

### Base Path Configuration

The application is configured to be served from the `/ggroid/` subfolder. The following aspects have been configured:

1. Vite's `base` option is set to `/ggroid/` in `vite.config.ts`
2. The `_redirects` file automatically redirects the root path to `/ggroid/`
3. All asset paths and links in components use the dynamic base path: `import.meta.env.BASE_URL`
4. The build script creates a `/ggroid/` subfolder in the `dist` directory

### Environment Variables

No special environment variables are required for basic deployment.

## Troubleshooting

### WASM Files

If you encounter issues with WebAssembly files:

1. Make sure the `_headers` file is properly deployed with the content type: `/ggroid/ggwave/* Content-Type: application/wasm`
2. Check the Cloudflare Pages logs to see if the WASM files are correctly included
3. Verify the paths are correctly set to `/ggroid/ggwave/ggwave.js`

### SPA Routing

The `_redirects` file is configured to handle client-side routing. If you encounter routing issues:

1. Verify the `_redirects` file is in the build output
2. Check the format to ensure it uses spaces (not tabs) between the parts
3. Ensure it includes both `/ggroid/*` and `/*` paths

## Post-Deployment Verification

After deployment, verify:

1. The root URL redirects to `/ggroid/`
2. The application loads correctly at `/ggroid/`
3. All assets (images, scripts) load properly from the `/ggroid/` base path
4. The audio functionality works, including WASM integration

## Manual Testing

Visit these URLs to verify proper routing:

1. `/` - Should redirect to `/ggroid/`
2. `/ggroid/` - Should load the application
3. `/ggroid/ggwave/ggwave.js` - Should serve the WASM JavaScript loader
4. `/any-other-path` - Should redirect to the application

## Maintenance

For future updates:

1. Run `npm run build:cloudflare` locally to test build output
2. Ensure all new assets use dynamic paths with `import.meta.env.BASE_URL`
3. Check the contents of the `dist` directory before pushing changes