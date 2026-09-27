// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// Dominio confirmado: la web actual ya vive en hhosthospitality.com (Vercel).
export default defineConfig({
  site: 'https://hhosthospitality.com',
  // URLs limpias (/contacto, /pilares/canal-directo), igual que `cleanUrls` en vercel.json.
  trailingSlash: 'never',
  build: { format: 'file' },
  // Astro 7 usa por defecto reglas JSX para los espacios, que pueden pegar palabras
  // entre texto y etiquetas en saltos de línea. `true` conserva un espacio donde lo había.
  compressHTML: true,
  integrations: [
    sitemap({
      // /solicitud es el puente privado de los emails de verificación: no se indexa.
      filter: (page) => !page.includes('/solicitud'),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
