import clerk from '@clerk/astro';
// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import { esES } from '@clerk/localizations';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  integrations: [
    clerk({
      localization: {
        ...esES,
        signIn: {
          start: {
            title: "Bienvenido a POSitive",
            subtitle: "Por favor, ingresa tus datos"
          }
        }
      }
    })
  ],

  output: 'server',

  adapter: node({
    mode: 'standalone'
  }),

  vite: {
    plugins: [tailwindcss()]
  }
});