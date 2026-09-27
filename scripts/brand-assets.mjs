/**
 * Genera los recursos derivados del logo oficial (src/assets/logo.png) en public/:
 * favicon SVG/PNG, icono de Apple, logo para datos estructurados e imagen para redes (Open Graph).
 * Uso: npm run assets
 */
import { copyFile, readFile } from 'node:fs/promises';
import sharp from 'sharp';

const root = new URL('../', import.meta.url);
const logo = await readFile(new URL('src/assets/logo.png', root));
const out = (name) => new URL(`public/${name}`, root).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const INK = { r: 11, g: 11, b: 11, alpha: 1 };

// Favicon vectorial: la versión SVG del monograma que ya usaba la web anterior.
await copyFile(new URL('public/logo-mark.svg', root), new URL('public/favicon.svg', root));

await sharp(logo).resize(32, 32).png().toFile(out('favicon-32.png'));
await sharp(logo).resize(512, 512).png({ compressionLevel: 9 }).toFile(out('logo-512.png'));

// iOS rellena la transparencia de negro: se compone sobre el negro de marca con margen.
const touchLogo = await sharp(logo).resize(148, 148).png().toBuffer();
await sharp({ create: { width: 180, height: 180, channels: 4, background: INK } })
  .composite([{ input: touchLogo, gravity: 'center' }])
  .png()
  .toFile(out('apple-touch-icon.png'));

// Open Graph 1200×630: portada negra con el brillo "fuego" de la web, logo y filete dorado con rombo.
const W = 1200;
const H = 630;
const background = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <radialGradient id="ember" cx="50%" cy="118%" r="70%">
      <stop offset="0" stop-color="#e25822" stop-opacity=".55"/>
      <stop offset="1" stop-color="#e25822" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="gold" cx="8%" cy="-10%" r="55%">
      <stop offset="0" stop-color="#c09f24" stop-opacity=".22"/>
      <stop offset="1" stop-color="#c09f24" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="rule" x1="0" x2="1">
      <stop offset="0" stop-color="#c09f24" stop-opacity="0"/>
      <stop offset=".5" stop-color="#c09f24"/>
      <stop offset="1" stop-color="#c09f24" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="#0b0b0b"/>
  <rect width="100%" height="100%" fill="url(#ember)"/>
  <rect width="100%" height="100%" fill="url(#gold)"/>
  <rect x="28" y="28" width="${W - 56}" height="${H - 56}" rx="18" fill="none" stroke="#c09f24" stroke-opacity=".35"/>
  <rect x="330" y="548" width="540" height="1.5" fill="url(#rule)"/>
  <rect x="594" y="543" width="12" height="12" fill="#c09f24" transform="rotate(45 600 549)"/>
</svg>`);
const ogLogo = await sharp(logo).resize(430, 430).png().toBuffer();
await sharp(background)
  .composite([{ input: ogLogo, top: 70, left: Math.round((W - 430) / 2) }])
  .jpeg({ quality: 86, mozjpeg: true })
  .toFile(out('og-image.jpg'));

console.log('Recursos de marca generados en public/.');
