// CloudFlare Pages configuration
export default {
  // Set the root directory to deploy from (required for subdir deployment)
  build: {
    baseDirectory: 'ggroid',
    command: 'npm run build',
    outputDirectory: 'out',
  },
  
  // If you want to customize how requests are rewritten
  routes: [
    // Rewrite all requests to our Next.js app (fallback route)
    { src: '/(.*)', dest: '/index.html' }
  ]
};