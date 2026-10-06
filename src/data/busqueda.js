//indice de busqueda: paginas y servicios para el buscador del nav
import { servicios } from './servicios.js';

const paginas = [
  { titulo: 'Inicio', tipo: 'pagina', href: '/' },
  { titulo: 'Sobre mi', tipo: 'pagina', href: '/sobre-mi' },
  { titulo: 'Proyectos', tipo: 'pagina', href: '/proyectos' },
  { titulo: 'Servicios', tipo: 'pagina', href: '/servicios' },
  { titulo: 'Contacto', tipo: 'pagina', href: '/contacto' },
];

export const indiceBusqueda = [
  ...paginas,
  ...servicios.map((servicio) => ({
    titulo: servicio.nombre,
    tipo: 'servicio',
    href: `/servicios/${servicio.slug}`,
  })),
];
