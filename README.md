# Hot Host Hospitality — web

Web de [hhosthospitality.com](https://hhosthospitality.com): *Hospitalidad con personalidad*.
Astro 7 + Tailwind CSS 4, salida 100 % estática, pensada para Vercel.

El contexto del proyecto (estrategia, marca, copy aprobada, reglas) está en [`CLAUDE.md`](CLAUDE.md) y en [`hot-host-context/`](hot-host-context/).

## Trabajar en local

Requisitos: Node.js 22.12 o superior (instalado: Node 24 LTS).

```bash
npm install
```

```bash
npm run dev
```

Abre http://localhost:4321. Otros comandos:

| Comando | Qué hace |
|---|---|
| `npm run build` | Genera el sitio final en `dist/` |
| `npm run preview` | Sirve `dist/` para revisarlo antes de publicar |
| `npm run assets` | Regenera favicons, icono de Apple e imagen para redes desde el logo |

En local y en las previews de Vercel **los formularios validan pero no envían nada**: el backend de Apps Script solo acepta solicitudes desde `https://hhosthospitality.com`.

## Dónde se cambia cada cosa

| Quiero cambiar… | Archivo |
|---|---|
| Email, teléfono, datos legales, endpoint de Apps Script | `src/config.ts` |
| Activar la descarga automática de la guía de amenities | `src/config.ts` → `AMENITIES_LEAD.enabled` |
| Pasos, precios, tabla comparativa, experiencias destacadas | `src/data/content.ts` |
| Menú y pilares | `src/data/navigation.ts` |
| Textos de una página | `src/pages/<página>.astro` |
| Colores, tipografías, botones | `src/styles/global.css` |

## Publicar en Vercel

Este repositorio es [`ElCaliente69/hot-host-hospitality`](https://github.com/ElCaliente69/hot-host-hospitality), el mismo que ya estaba conectado a Vercel con el dominio `hhosthospitality.com`. La web nueva sustituye a la anterior sobre su mismo historial.

- **Producción = rama `main`.** Cada push a `main` publica en hhosthospitality.com.
- **Cualquier otra rama** genera una vista previa en Vercel (con su propio enlace) sin tocar el dominio. Es la forma segura de revisar cambios.
- Vercel detecta Astro; `vercel.json` fija el comando de build y la carpeta `dist`.
- Mantén `hhosthospitality.com` (sin `www`) como dominio principal: el formulario solo funciona en ese origen exacto.
- Tras publicar, prueba el flujo completo en `https://hhosthospitality.com/contacto?test=1`.

`vercel.json` redirige todas las URLs de la web anterior (`/servicios.html`, `/gestion-integral.html`, `/experiencias.html`, `/sitemap.xml`…) a sus equivalentes nuevas, y mantiene `/solicitud.html`, a la que enlazan los emails de verificación ya enviados.

La carpeta [`google-apps-script/`](google-apps-script/) es el código del backend (Apps Script "Hot Host - Integración web"), heredado del repositorio anterior: no forma parte de la web y Vercel la ignora. Ya no hay publicación en GitHub Pages: la web solo se publica en Vercel.

> La carpeta antigua `Documents\Default Project\hot-host-hospitality` queda obsoleta: trabaja siempre en esta.

## Revisión pendiente de Yunior

La copy de `hot-host-context/docs/03-copy-web.md` se ha usado tal cual. Para montar las páginas hicieron falta textos de enlace que **no estaban en la copy aprobada**; conviene revisarlos:

- **Botones y enlaces:** "Ver los 3 pilares", "Conocer el pilar", "Ver pilar", "Ver los 5 pasos en detalle", "Conocer la historia", "Empezar ahora", "Ver los niveles", "Ver cómo funciona", "Pedir la guía por email".
- **Inicio:** franja del fundador — "Trayectoria personal de Yunior Bacallao, fundador, en hoteles y en hostelería — antes de que existiera Hot Host."
- **Pilares y Método:** etiquetas "Sin método" / "Con método" y "Agencias tradicionales" / "Hot Host".
- **Motor de Experiencias:** títulos de las capas ("Replicables Hot Host", "A medida de tu propiedad", "Colaboradores locales"); "Seis de las veinte experiencias replicables." y su entradilla; la frase "Restaurantes, actividades, bodegas… No hay una lista fija: varía según la ciudad y los acuerdos vigentes."; la selección de las 6 experiencias (El Pato Perdido, La Carta Sellada, El Mapa Prohibido, La Carta del Futuro, El Explorador Junior, Atardecer Compartido).
- **Precios:** titular "Basic, Essentials o Iconic: 20%, 25% o 30%."; "Qué cambia entre niveles" y su entradilla; la nota que explica HHH Experiences; el bloque "¿Qué nivel me conviene?".
- **Sobre Hot Host:** las tres tarjetas de "Credenciales del fundador".
- **Contacto:** "Qué pasa después", "¿Prefieres escribir?" y el grupo "Tus datos". En la ayuda de la cita, "nuestro equipo debe confirmarlo" pasa a "tenemos que confirmarlo" (Hot Host es una sola persona).
- **Legal:** aviso legal, privacidad y cookies vienen de la web anterior, adaptados a los flujos nuevos (guía de amenities, Vercel, Google Workspace, sin cookies). Conviene una revisión legal, sobre todo del consentimiento combinado "recibir la guía y comunicaciones".

## Pendiente técnico para activar la guía de amenities

Según `hot-host-context/docs/05-sistema-tecnico.md` §7 (acciones en Drive/Apps Script, no en este repo):

1. Añadir al `doPost` del Apps Script el enrutado `formType=amenities_pdf` (hoy no existe: el formulario fallaría).
2. Subir `guia-amenities.pdf` a Drive, compartirlo "cualquiera con el enlace: lector" y pegar su ID en `AMENITIES_PDF_FILE_ID`.
3. Poner `AMENITIES_LEAD.enabled = true` en `src/config.ts` y publicar.
