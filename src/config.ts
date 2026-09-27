/**
 * Datos centrales del sitio. Si cambia algo (email, endpoint, datos legales), se cambia aquí.
 * Los datos legales vienen de la web actual (JSON-LD y aviso legal de hhosthospitality.com).
 */
export const SITE = {
  name: 'Hot Host Hospitality',
  shortName: 'Hot Host',
  slogan: 'Hospitalidad con personalidad',
  url: 'https://hhosthospitality.com',
  locale: 'es_ES',
  email: 'direccion@hhosthospitality.com',
  phone: '+34 600 907 716',
  founder: {
    name: 'Yunior Bacallao',
    fullName: 'Yunior Bacallao Alonso',
    role: 'Fundador',
  },
  legal: {
    owner: 'Yunior Bacallao Alonso',
    taxId: '56100127E',
    address: 'Calle Gabriel Blanco 2, 4i',
    postalCode: '41007',
    city: 'Sevilla',
    country: 'España',
    updated: '27 de septiembre de 2026',
  },
} as const;

/**
 * Web App de Google Apps Script ("Hot Host - Integración web"). Es el mismo endpoint
 * público que usaba la web anterior (assets/config.js). No es un secreto: va en el HTML.
 */
export const APPS_SCRIPT_ENDPOINT =
  'https://script.google.com/macros/s/AKfycbwG6boesUWYOr5dFEq_1GlidS_b7qtrYZlFcdo3LTYDrh7WSk1Oxcxcvuz_oTPTkkk/exec';

/**
 * Lead magnet de la Guía de Amenities (ver hot-host-context/docs/05-sistema-tecnico.md).
 * Déjalo en `false` hasta que el doPost del Apps Script enrute `formType=amenities_pdf`
 * y el PDF esté compartido en Drive; mientras tanto el formulario ofrece pedirla por email.
 */
export const AMENITIES_LEAD = {
  enabled: false,
  endpoint: APPS_SCRIPT_ENDPOINT,
};

/**
 * El backend solo acepta envíos cuyo sourceUrl empiece por esta URL y responde por
 * postMessage únicamente a este origen: fuera de él (localhost, previews) no se envía nada real.
 */
export const PRODUCTION_ORIGIN = new URL(SITE.url).origin;
