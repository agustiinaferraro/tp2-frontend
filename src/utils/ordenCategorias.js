//los proyectos de animacion (motion graphics) van SIEMPRE primero en todos los listados:
//sus portadas traen video o gif en movimiento y son las que mas llaman la atencion.
//ademas motion graphics y edicion de video comparten proyectos: si quedan uno al lado del
//otro se ven dos carruseles casi iguales, por eso mientras una va arriba del todo la otra
//se va al final (antes pasaba al revés: motion quedaba al final y nadie lo veía primero).
//se usa en todos los listados del sitio.
export const SLUG_ANIMACION_PRIMERO = 'motion-graphics';
export const SLUG_VIDEO_AL_FINAL = 'edicion-de-video';

//ordena una lista dejando primero el elemento de animacion y al final el de edicion de video.
//es estable: el resto de los elementos conserva el orden original.
//obtenerSlug permite usarlo tanto con slugs sueltos (string) como con objetos.
export function ordenarAnimacionPrimero(items, obtenerSlug = (item) => item) {
  const prioridad = (item) => {
    const slug = obtenerSlug(item);
    if (slug === SLUG_ANIMACION_PRIMERO) return -1;
    if (slug === SLUG_VIDEO_AL_FINAL) return 1;
    return 0;
  };
  return [...items].sort((a, b) => prioridad(a) - prioridad(b));
}
