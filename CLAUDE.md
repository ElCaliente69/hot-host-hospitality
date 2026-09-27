# Hot Host Hospitality — memoria del proyecto

Lee esto siempre al empezar. Es el resumen de meses de trabajo de estrategia, marca y copy hecho en Claude (chat), exportado aquí para que tengas el mismo contexto sin que Yunior tenga que repetirlo. Los detalles largos están en `hot-host-context/docs/`; este archivo es el índice y las reglas que no se rompen.

## Qué es Hot Host

Empresa de gestión de alquileres vacacionales que Yunior Bacallao está construyendo desde cero (aún no ha gestionado ninguna propiedad — se está lanzando ahora). Cliente objetivo: propietarios particulares con 1-3 propiedades. Yunior opera en solitario, en remoto, sin límite geográfico fijo.

Tres pilares (en este orden, cada uno se apoya en el anterior):

1. **Método con toque humano** — estándares operativos hoteleros, pero sin automatizar el trato.
2. **Canal Directo** — reserva propia + redes sociales por propiedad, para depender menos de las OTAs.
3. **Motor de Experiencias** — experiencias que suben el valor percibido, el ADR y la reputación.

Precios: comisión pura sobre ingresos, 3 niveles — Basic 20%, Essentials 25% (recomendado), Iconic 30% — publicados abiertamente en la web. Detalle completo en `hot-host-context/docs/01-estrategia.md`.

## Regla que no se rompe: honestidad radical

**Nunca inventar clientes, testimonios, cifras de ocupación/ADR ni casos de éxito de Hot Host como empresa.** Hot Host todavía no tiene track record propio. Lo único real y publicable:

- La trayectoria **personal** de Yunior: +13 años en hostelería, credencial del fundador, no de la empresa.
- "Operación Patito", probada por Yunior en hoteles donde trabajó — antes de Hot Host.
- El caso "Estefany" fue una asesoría informal de Yunior a una propietaria, **no gestión de Hot Host** — no es demostrable, no se usa como dato verificado, solo como anécdota personal si acaso.

Si en algún momento hace falta "prueba social" y no existe, la respuesta correcta es no inventarla — nunca rellenar con un testimonio o cifra ficticia, ni "de ejemplo". Tampoco fotos de stock que parezcan "nuestras propiedades".

Detalle completo: `hot-host-context/docs/01-estrategia.md`, sección 7.

## Marca

- **Nombre:** Hot Host (Hot Host Hospitality). **Eslogan:** "Hospitalidad con personalidad". No reabrir esta decisión — ya se exploraron alternativas y se descartaron.
- **Logo:** `hot-host-context/assets/logo.png` — monograma HHH, gradiente rojo/naranja fuego/dorado. Es el logo definitivo (se descartó una recoloración "mediterránea"). En la web se usa además `public/logo-mark.svg`, la versión vectorial del mismo monograma que ya usaba la web anterior.
- **Paleta:** Negro `#0B0B0B`/`#000000`, Dorado `#C09F24`, Naranja fuego `#E25822`, Blanco `#FFFFFF` / Crema `#FBF7EE`.
- **Tipografía:** Playfair Display / Cormorant Garamond (titulares, serif), Montserrat / Lato (texto, UI, sans). Auto-hospedadas en `public/fonts/`.
- **Tono:** profesional, cercano, honesto. Humor puntual y con medida (ver la metáfora del pastel en `hot-host-context/docs/04-experiencias-amenities.md`).

Detalle completo: `hot-host-context/docs/02-marca.md`.

## Fuente de verdad del contenido

**Google Drive es la fuente de verdad de este proyecto** (carpeta "Hot Host — Reconstrucción 2026"), no este repositorio ni el chat de Claude. `hot-host-context/` es una exportación puntual (27 de septiembre de 2026): `docs/` (estrategia, marca, copy, experiencias, sistema técnico) y `assets/` (kit de marca original, PDF del lead magnet). Si algo relevante cambia en Drive, hay que volver a exportarlo — pregúntale a Yunior si no estás seguro de si sigue actualizado.

La copy de `hot-host-context/docs/03-copy-web.md` es la voz de Yunior, revisada por él: se usa tal cual, no como placeholder.

---

## El sitio — cómo está construido (decidido con Yunior el 27/09/2026)

- **Stack:** Astro 7 (salida estática) + Tailwind CSS 4 (`@tailwindcss/vite`), Node 24 LTS. Despliegue en **Vercel** (donde ya estaba la web anterior). Dominio: `hhosthospitality.com` (confirmado: la web anterior vive ahí).
- **Repositorio:** `origin` = `github.com/ElCaliente69/hot-host-hospitality` (privado). Vercel publica producción desde `main`; cualquier otra rama genera una preview. La web nueva sustituyó a la anterior sobre el mismo historial. `google-apps-script/` es el código del backend heredado de ese repo (Vercel lo ignora). La carpeta local antigua `Documents\Default Project\hot-host-hospitality` está obsoleta: trabajar solo en esta.
- **Comandos:** `npm install` · `npm run dev` (http://localhost:4321) · `npm run build` (genera `dist/`) · `npm run preview` · `npm run assets` (regenera favicons/OG desde el logo).
- En este PC, Node está en `C:\Program Files\nodejs` y puede no estar en el PATH de terminales abiertas antes de instalarlo.

### Mapa del código

- `src/config.ts` — datos centrales: email, teléfono, datos legales, endpoint del Apps Script, interruptor del lead magnet. **Si cambia un dato, se cambia aquí.**
- `src/data/navigation.ts` — pilares y menú. `src/data/content.ts` — pasos, niveles de precio, tabla comparativa, experiencias destacadas. `src/data/amenities.json` — copia de `hot-host-context/assets/content.json` (23 amenities con icono).
- `src/pages/` — 9 páginas del MVP (`index`, `pilares/` + 3 subpáginas, `como-funciona`, `precios`, `sobre-hot-host`, `contacto`) + `aviso-legal`, `privacidad`, `cookies`, `404` y `solicitud`.
- `src/components/` — `Header`, `Footer`, `PageHero`, `SectionHeading`, `CtaBanner`, `PillarHouse` (la "casa" de los 3 pilares bajo el tejado del logo), `PillarPager`, `Icon` (sprite de marca), `AmenitiesLeadForm`.
- `src/styles/global.css` — fuentes, tokens de marca (`@theme static`) y componentes base (`.btn`, `.eyebrow`, `.num`, `.card`, `.rule-diamond`, formularios…).
- `src/scripts/contact-form.js` + `countries.js` — formulario "Analizar mi propiedad" portado de la web anterior.
- `vercel.json` — URLs limpias, redirecciones de todas las URLs de la web anterior (`servicios.html`, `gestion-integral.html`…) y cabeceras.

### Formulario "Analizar mi propiedad" (flujo existente, NO rediseñar)

- Portado tal cual de la web anterior (`assets/app.js`): mismos campos/ids/names, mismo payload `version: 3`, mismo envío (form nativo + iframe oculto al Web App del Apps Script "Hot Host - Integración web"; respuesta por `postMessage`). El backend no se ha tocado.
- **Solo funciona en `https://hhosthospitality.com`**: el Apps Script exige que `sourceUrl` empiece por esa URL y solo responde por `postMessage` a ese origen. En local y en previews de Vercel el formulario valida pero **no envía** (muestra un aviso de "Vista previa"). No quitar esa protección.
- Herramienta interna de pruebas: `/contacto?test=1` (solo envía en producción; límite del backend: 5 pruebas por email cada 6 h).
- **`/solicitud.html` es crítica:** los emails de verificación y de revisión del Apps Script enlazan a `https://hhosthospitality.com/solicitud.html#request=…` / `#admin=…`. La página `src/pages/solicitud.astro` redirige al Web App. No renombrarla ni moverla.

### Lead magnet "Guía de Amenities"

- Formulario en la subpágina Motor de Experiencias. Contrato: POST (`email`, `consentAccepted=true`, `formType=amenities_pdf`, `sourceUrl`) al mismo Web App.
- Desactivado (`AMENITIES_LEAD.enabled = false` en `src/config.ts`) hasta que se complete lo pendiente de `hot-host-context/docs/05-sistema-tecnico.md` §7: el `doPost` actual todavía **no** enruta `formType=amenities_pdf`. Mientras tanto ofrece pedir la guía por email.
- El PDF no se publica en `public/` a propósito: va gated por email.

### Trampas conocidas

- Los `<style>` de los componentes Astro no van en capa CSS y **ganan a las utilidades de Tailwind**: no mezclar en un mismo elemento una utilidad (`lg:hidden`, `lg:sticky`…) con una propiedad que ya fija su estilo con ámbito; poner la media query en el `<style>`.
- `compressHTML: true` en `astro.config.mjs` a propósito: con el modo JSX por defecto de Astro 7 se pegaban palabras entre texto y etiquetas.
- El compilador Rust de Astro 7 no corrige HTML inválido: cerrar siempre las etiquetas.
- Contraste: el naranja `#E25822` y el dorado `#C09F24` no llegan a 4.5:1 sobre crema en texto pequeño; para eso están `fire-deep` (#C2461A) y `gold-ink` (#7D6716).

### Pendiente antes de lanzar (acciones de Yunior)

1. Revisar la copy nueva de enlace (ver lista en `README.md`) y los textos legales (privacidad/cookies adaptados a los nuevos flujos; conviene revisión legal, en especial el consentimiento combinado "guía + comunicaciones").
2. Revisar la preview de la rama `web-nueva` en Vercel y pasarla a `main` para publicarla en `hhosthospitality.com` (apex, sin `www` como principal).
3. Probar el formulario en producción con `/contacto?test=1`.
4. Lead magnet: añadir el enrutado `formType=amenities_pdf` al `doPost`, subir/compartir el PDF, pegar su ID, y poner `AMENITIES_LEAD.enabled = true`.
