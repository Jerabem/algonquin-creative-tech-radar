import { defineConfig } from 'vite';

// NOTE: `base` must match the GitHub repository name for GitHub Pages.
// If you fork/rename the repo, update this path accordingly.
export default defineConfig({
  base: '/algonquin-creative-tech-radar/',
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
