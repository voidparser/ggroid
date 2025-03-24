/**
 * Cloudflare Pages deployment helper
 * 
 * This is just a marker file to indicate settings for Cloudflare deployment.
 * The actual build and deployment is configured in wrangler.toml and through
 * the Cloudflare dashboard.
 */

// Expected build settings:
// - Build command: npm run build:cloudflare
// - Build output directory: dist
// - Environment variables: none required

// The content from dist should be deployed directly at the root URL.