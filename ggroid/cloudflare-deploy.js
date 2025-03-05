/**
 * Cloudflare Pages deployment helper
 * 
 * This is just a marker file to indicate settings for Cloudflare deployment.
 * The actual build and deployment is configured in wrangler.toml and through
 * the Cloudflare dashboard.
 */

// Expected build settings:
// - Build command: cd ggroid && npm run build
// - Build output directory: ggroid/out
// - Environment variables: none required

// The content from ggroid/out should be deployed directly at the root URL.