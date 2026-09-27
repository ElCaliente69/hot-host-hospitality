export interface NavLink {
  label: string;
  href: string;
}

export interface PillarLink extends NavLink {
  number: string;
  summary: string;
}

/** Los tres pilares, en orden: cada uno se apoya en el anterior. */
export const PILLARS: PillarLink[] = [
  {
    number: '01',
    label: 'Método con toque humano',
    href: '/pilares/metodo-con-toque-humano',
    summary: 'Un método operativo con estándares hoteleros que no pierde el trato humano.',
  },
  {
    number: '02',
    label: 'Canal Directo',
    href: '/pilares/canal-directo',
    summary: 'Un canal de reserva propio que reduce lo que te quitan las plataformas.',
  },
  {
    number: '03',
    label: 'Motor de Experiencias',
    href: '/pilares/motor-de-experiencias',
    summary:
      'Un motor de experiencias que hace que los huéspedes recuerden tu propiedad — y paguen más por volver a ella.',
  },
];

export const MAIN_NAV: NavLink[] = [
  { label: 'Pilares', href: '/pilares' },
  { label: 'Cómo funciona', href: '/como-funciona' },
  { label: 'Precios', href: '/precios' },
  { label: 'Sobre Hot Host', href: '/sobre-hot-host' },
  { label: 'Contacto', href: '/contacto' },
];

export const LEGAL_NAV: NavLink[] = [
  { label: 'Aviso legal', href: '/aviso-legal' },
  { label: 'Privacidad', href: '/privacidad' },
  { label: 'Cookies', href: '/cookies' },
];

/** Destino de todos los botones "Analizar mi propiedad". */
export const ANALYZE_HREF = '/contacto#analizar';
