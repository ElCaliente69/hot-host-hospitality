# Hot Host — paquete de contexto para Claude Code

Esto es un export de todo lo decidido en el chat de Claude (estrategia, marca, copy de la web, catálogo de experiencias/amenities e integración técnica del lead magnet), pensado para arrancar el MVP del sitio en **Claude Code** sin perder nada de lo ya trabajado.

## Cómo usarlo

1. Crea la carpeta de tu proyecto nuevo, por ejemplo:
   ```bash
   mkdir -p ~/Proyectos/hot-host-web
   cd ~/Proyectos/hot-host-web
   git init
   ```
2. Copia dentro **todo el contenido** de este paquete (el archivo `CLAUDE.md`, la carpeta `docs/` y la carpeta `assets/`) directamente en la raíz de esa carpeta.
3. Si no tienes Claude Code instalado todavía, instálalo (comprueba el método actual en [docs.claude.com/claude-code](https://docs.claude.com/claude-code) por si cambió):
   ```bash
   npm install -g @anthropic-ai/claude-code
   ```
4. Arranca Claude Code dentro de la carpeta del proyecto:
   ```bash
   claude
   ```
   Al arrancar en esa carpeta, Claude Code lee `CLAUDE.md` automáticamente — así ya tiene toda la memoria del proyecto sin que tengas que volver a explicar nada.
5. Primer mensaje sugerido:
   > Lee CLAUDE.md y la carpeta docs/. Vamos a construir el MVP de la web de Hot Host. Antes de escribir código, propón un stack (yo tengo cero preferencia fuerte) y la estructura de carpetas, y luego empecemos por la página de Inicio.

## Qué hay en cada carpeta

- **`CLAUDE.md`** — el resumen que Claude Code carga solo al arrancar: negocio, marca, regla de honestidad, estructura del sitio, qué no tocar.
- **`docs/`** — el detalle completo, para que Claude Code lo lea bajo demanda:
  - `01-estrategia.md` — pilares, cliente objetivo, precios, honestidad comercial.
  - `02-marca.md` — nombre, logo, paleta, tipografía, tono (este documento no existía en Drive; se redactó ahora a partir de las decisiones tomadas en el chat).
  - `03-copy-web.md` — el copy real de las 9 páginas del sitio.
  - `04-experiencias-amenities.md` — catálogo de 20 experiencias + las 23 amenities finales con su icono.
  - `05-sistema-tecnico.md` — cómo funciona el backend de leads (el que ya existe, y el nuevo del PDF de amenities).
- **`assets/`** — todo lo reutilizable para construir el sitio de verdad:
  - `logo.png`
  - `fonts/` — tipografía de marca auto-hospedable.
  - `icons/icons-sprite.svg` — los 27 iconos a medida, listos para `<use>`.
  - `content.json` — el copy de la guía de amenities en JSON.
  - `guia-amenities.pdf` — el lead magnet ya terminado (el mismo que se envió por chat).

## Importante: Drive sigue siendo la fuente de verdad

Este paquete es una foto fija del 27 de septiembre de 2026. Si vuelves a Claude (chat) y cambias algo de estrategia, marca o copy, ese cambio queda en Google Drive — pero **no se actualiza solo aquí**. Si pasa bastante tiempo entre esta exportación y cuando retomes el MVP, vale la pena pedir en el chat "vuelve a exportar el contexto para Claude Code" antes de seguir.
