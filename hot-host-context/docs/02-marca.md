# Hot Host — Marca (Fase 2): Decisiones cerradas

Última actualización: 27 de septiembre de 2026

Este documento no existía como tal en Drive — la carpeta "02 Marca" estaba vacía. Se redacta ahora para dejar constancia de las decisiones de marca, tomadas a lo largo de varias conversaciones, antes de empezar la Fase 3 (Web) en Claude Code.

## 1. Nombre y eslogan

- **Nombre:** Hot Host (razón social: Hot Host Hospitality).
- **Eslogan (ES):** "Hospitalidad con personalidad".
- **Eslogan (EN):** "Luxury hospitality with personality".
- **Historial:** se exploraron varios nombres y eslóganes alternativos (juegos de palabras, variaciones más "boutique"); ninguno convenció más que el original. Decisión: mantener "Hot Host" tal cual. No reabrir esta discusión salvo que Yunior lo pida explícitamente.

## 2. Logo

- Monograma "HHH" (Hot Host Hospitality) en un badge redondeado tipo icono de app, con silueta de tejado/casa integrada en el trazo superior de las letras.
- Colores del logo: gradiente rojo → naranja fuego → dorado sobre fondo oscuro, letras en blanco/dorado.
- Archivo: `assets/logo.png` (842×842, fondo transparente).
- **Historial:** se exploró en paralelo una recoloración "mediterránea" del logo (paleta tierra: blanco, terracota, oliva — variantes "Bodega íntima", etc.) para test A/B. Esa exploración quedó **descartada**: la decisión final y vigente es usar el logo ORIGINAL (rojo/naranja fuego/dorado) tal cual. Si en algún archivo antiguo aparece la paleta mediterránea, no es la vigente.

## 3. Paleta de color oficial

| Color | Hex | Uso |
|---|---|---|
| Negro | `#000000` (en la guía de amenities se usó `#0B0B0B` para que no fuera un negro absoluto en impresión) | Fondos de portada/cierre, texto principal, acentos |
| Dorado | `#C09F24` | Acentos, líneas finas, iconografía, detalles premium |
| Naranja fuego | `#E25822` | Acento secundario/CTA, eyebrows, highlights |
| Blanco | `#FFFFFF` (o crema `#FBF7EE` sobre fondos claros, más cálido que blanco puro) | Fondos de contenido, texto sobre fondo oscuro |

## 4. Tipografía

- **Titulares / display:** Playfair Display (peso 700 para H1/H2). Alternativas de la misma familia: Cormorant Garamond (itálica, para citas destacadas y sutítulos con carácter), Didot.
- **Texto / UI:** Montserrat (eyebrows, labels, mayúsculas con letter-spacing, peso 600) y Lato (cuerpo de texto, peso 400/700).
- Fuentes ya descargadas y filtradas a subsets `latin` + `latin-ext` (cubren tildes y ñ) en `assets/fonts/` — evita depender de Google Fonts en tiempo de ejecución si se quiere auto-hospedar.

## 5. Voz y tono

Profesional, cercano, honesto — "nada que no se pueda demostrar" (ver `01-estrategia.md`, sección 7). En la práctica:

- Frases cortas, directas, sin jerga corporativa vacía.
- Humor puntual y con medida cuando ayuda a explicar algo incómodo (ej. la metáfora del pastel para explicar cómo se financian los amenities).
- Nunca se inventan clientes, cifras o resultados de Hot Host como empresa. La trayectoria personal de Yunior (13 años en hostelería, Operación Patito, el caso "Estefany") se presenta siempre como credencial **personal del fundador**, nunca como historial de Hot Host.

## 6. Identidad visual aplicada (referencia)

La Guía de Amenities (`assets/guia-amenities.pdf`, generada en septiembre 2026) es la primera pieza real construida con este sistema de marca y sirve de referencia de estilo para la web:

- Fondo crema/blanco para contenido, negro para portada y cierre (efecto "libro con sobrecubierta").
- Iconografía propia monolínea (`assets/icons/icons-sprite.svg`), no iconos de bancos genéricos — trazo `currentColor`, `stroke-width` constante, un icono por concepto.
- Bordes finos dorados, tarjetas blancas con esquinas redondeadas suaves, mucho aire/whitespace — evitar la sensación "folleto apretado".
- Numeración editorial sutil (ej. "02.03") en itálica, como detalle de maquetación de revista, no de plantilla.

## 7. Dominio y contacto

- Dominio: `hhosthospitality.com`
- Email de contacto: `direccion@hhosthospitality.com`
- Fundador: Yunior Bacallao
