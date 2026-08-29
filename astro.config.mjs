import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://dusa.studio',
  integrations: [
    sitemap({
      // /preview/* and /staging/* hold unreleased work for review only — never index them.
      filter: (page) => !page.includes('/404') && !page.includes('/preview/') && !page.includes('/staging/'),
    }),
  ],
});
