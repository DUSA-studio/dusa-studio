import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://dusa.studio',
  integrations: [
    sitemap({
      // /preview/* holds unreleased sections for review only — never index them.
      // /thank-you (every locale) is a post-conversion page and is noindex.
      filter: (page) => !page.includes('/404') && !page.includes('/preview/') && !/\/thank-you\/?$/.test(page),
    }),
  ],
});
