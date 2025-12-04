// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import partytown from '@astrojs/partytown';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

import markdoc from '@astrojs/markdoc';

// https://astro.build/config
export default defineConfig({
  site: 'https://zig-index.github.io',
  output: 'static',
  
  integrations: [
    react(),
    mdx(),
    partytown(),
    sitemap({
      filter: (page) => !page.includes('/404') && !page.includes('/500'),
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
      customPages: [
        'https://zig-index.github.io/',
        'https://zig-index.github.io/packages',
        'https://zig-index.github.io/applications',
        'https://zig-index.github.io/search',
        'https://zig-index.github.io/how-to-add',
        'https://zig-index.github.io/privacy',
        'https://zig-index.github.io/terms',
      ],
      serialize: (item) => {
        // Set higher priority for main pages
        if (item.url === 'https://zig-index.github.io/') {
          return { ...item, priority: 1.0, changefreq: 'daily' };
        }
        if (item.url.includes('/packages') || item.url.includes('/applications')) {
          return { ...item, priority: 0.9, changefreq: 'daily' };
        }
        if (item.url.includes('/search')) {
          return { ...item, priority: 0.8, changefreq: 'weekly' };
        }
        if (item.url.includes('/how-to-add')) {
          return { ...item, priority: 0.6, changefreq: 'monthly' };
        }
        if (item.url.includes('/privacy') || item.url.includes('/terms')) {
          return { ...item, priority: 0.3, changefreq: 'yearly' };
        }
        return item;
      },
    }),
    markdoc(),
  ],

  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': '/src',
      },
    },
  },
});