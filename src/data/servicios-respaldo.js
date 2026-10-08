//respaldo de la lista de servicios (slug + nombre)
//la fuente real es el backend (GET /api/servicios). esto se usa solo como
//red de seguridad al generar las paginas /servicios/[slug] en el build.
export const serviciosRespaldo = [
  { slug: 'desarrollo-full-stack', nombre: 'Desarrollo Full Stack' },
  { slug: 'diseno-ux-ui', nombre: 'Diseño UX/UI' },
  { slug: 'diseno-grafico-identidad', nombre: 'Diseño Gráfico e Identidad' },
  { slug: 'edicion-de-video', nombre: 'Edición de Video' },
  { slug: 'motion-graphics', nombre: 'Motion Graphics / Animación' },
];