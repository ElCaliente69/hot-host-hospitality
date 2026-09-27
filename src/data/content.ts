/**
 * Contenido estructurado del sitio. Todo sale de hot-host-context/docs/
 * (03-copy-web.md, 01-estrategia.md y 04-experiencias-amenities.md): no añadir aquí
 * clientes, cifras ni resultados que no existan (regla de honestidad radical).
 */

export interface Step {
  title: string;
  text: string;
}

/** "Cómo funciona" — los 5 pasos (03-copy-web.md). */
export const STEPS: Step[] = [
  { title: 'Cuéntanos tu propiedad', text: 'Completas el formulario, en pocos minutos.' },
  {
    title: 'Auditoría y propuesta',
    text: 'Analizamos tu propiedad y te proponemos un nivel (Basic, Essentials o Iconic).',
  },
  { title: 'Puesta a punto', text: 'Fotos, presencia digital, primeros detalles y experiencias.' },
  {
    title: 'Gestión activa',
    text: 'Check-in/out, atención, precios dinámicos, experiencias en marcha.',
  },
  { title: 'Revisión continua', text: 'Ajustamos y mejoramos cada temporada.' },
];

export interface Tier {
  key: 'basic' | 'essentials' | 'iconic';
  name: string;
  commission: number;
  recommended: boolean;
  features: string[];
}

/** Precios — cerrados en la Fase 1 (01-estrategia.md, sección 4). */
export const TIERS: Tier[] = [
  {
    key: 'basic',
    name: 'Basic',
    commission: 20,
    recommended: false,
    features: [
      'Gestión operativa esencial',
      'Redes sociales: 1 pieza por semana',
      'Web de reservas esencial',
      '15% de participación en el margen de HHH Experiences',
    ],
  },
  {
    key: 'essentials',
    name: 'Essentials',
    commission: 25,
    recommended: true,
    features: [
      'Redes sociales: 3 piezas por semana, hasta 3 canales',
      'Web propia sincronizada por PMS/API',
      '30% de participación en el margen de HHH Experiences',
    ],
  },
  {
    key: 'iconic',
    name: 'Iconic',
    commission: 30,
    recommended: false,
    features: [
      'Redes multicanal: 5 piezas por semana + derivados',
      'Producción audiovisual premium y dron',
      'Web premium con embudos y SEO local',
      '50% de participación en el margen de HHH Experiences',
    ],
  },
];

/** Filas de la tabla comparativa. `true` = incluido, `null` = no incluido. */
export const TIER_COMPARISON: { label: string; values: [string | true | null, string | true | null, string | true | null] }[] = [
  { label: 'Comisión sobre ingresos netos', values: ['20%', '25%', '30%'] },
  { label: 'Gestión operativa con estándares hoteleros', values: [true, true, true] },
  {
    label: 'Redes sociales',
    values: ['1 pieza por semana', '3 piezas por semana, hasta 3 canales', 'Multicanal: 5 piezas por semana + derivados'],
  },
  {
    label: 'Web de reservas',
    values: ['Esencial', 'Propia, sincronizada por PMS/API', 'Premium, con embudos y SEO local'],
  },
  { label: 'Producción audiovisual premium y dron', values: [null, null, true] },
  { label: 'Participación en el margen de HHH Experiences', values: ['15%', '30%', '50%'] },
];

export interface Experience {
  name: string;
  story: string;
  property: string;
  stay: string;
  route: string;
}

/**
 * 6 de las 20 experiencias replicables (04-experiencias-amenities.md, sección A).
 * La copy pide mostrar 4-6 destacadas, no el catálogo completo.
 */
export const FEATURED_EXPERIENCES: Experience[] = [
  {
    name: 'El Pato Perdido',
    story:
      'Un pato lleva años viviendo en Sevilla, apareciendo en un apartamento distinto cada vez. Pistas durante la estancia; si lo encuentras, premio (cena, crucero, experiencia flamenca).',
    property: 'Cualquier propiedad',
    stay: 'Cualquier estancia',
    route: 'Con ruta local',
  },
  {
    name: 'La Carta Sellada',
    story:
      'Un sobre que no se puede abrir hasta la última noche. Dentro, una sorpresa que cambia cada mes (late checkout, cena gratis, experiencia).',
    property: 'Cualquier propiedad',
    stay: '2+ noches',
    route: 'Adaptable a cualquier ciudad',
  },
  {
    name: 'El Mapa Prohibido',
    story:
      'Un mapa dibujado a mano por Hot Host con lugares donde casi ningún turista entra, cada uno con su pequeña historia.',
    property: 'Cualquier propiedad',
    stay: 'Cualquier estancia',
    route: 'Con ruta local',
  },
  {
    name: 'La Carta del Futuro',
    story:
      'Escriben una carta a su «yo» del futuro antes de irse; la reciben un año después con un descuento y un «Sevilla te sigue esperando».',
    property: 'Cualquier propiedad',
    stay: 'Cualquier estancia',
    route: 'Adaptable a cualquier ciudad',
  },
  {
    name: 'El Explorador Junior',
    story:
      'Mini-pasaporte de aventuras para niños: 3-4 misiones sencillas y seguras por el barrio, premio simbólico al final.',
    property: 'Familias con niños',
    stay: 'Cualquier estancia',
    route: 'Ruta local ligera',
  },
  {
    name: 'Atardecer Compartido',
    story:
      'Recomendación reservada de un mirador o azotea con vistas, con una copa de bienvenida gestionada con un colaborador.',
    property: 'Parejas',
    stay: 'Fin de semana',
    route: 'Con ruta local',
  },
];

/** Experiencias específicas de propiedad: ejemplos ilustrativos, no lista cerrada (sección B). */
export const TAILORED_EXAMPLES: { name: string; text: string }[] = [
  {
    name: 'Desayuno con encanto',
    text: 'Si la propiedad no incluye desayuno, se acuerda con una panadería o cafetería cercana la entrega diaria (o un vale), convirtiendo una carencia en un plus con sabor local.',
  },
  {
    name: 'Terraza con aperitivo al atardecer',
    text: 'Si la propiedad tiene terraza o azotea, se prepara un kit de aperitivo (vino o cerveza local y algo para picar) para la primera tarde.',
  },
  {
    name: 'Kit de bienvenida de barrio',
    text: 'Recomendaciones muy locales de esa calle concreta, no genéricas de ciudad.',
  },
];
