//algunas categorias comparten los mismos proyectos (motion graphics y edicion de video),
//por eso "motion graphics" se muestra siempre al final: asi no quedan dos listados o
//carruseles iguales pegados uno al lado del otro. se usa en todos los listados del sitio.
export const SLUG_MOTION_AL_FINAL = 'motion-graphics';

//ordena una lista dejando al final el elemento cuyo slug sea motion graphics.
//es estable: el resto de los elementos conserva el orden original.
//obtenerSlug permite usarlo tanto con slugs sueltos (string) como con objetos.
export function ordenarMotionAlFinal(items, obtenerSlug = (item) => item) {
  const esMotion = (item) => obtenerSlug(item) === SLUG_MOTION_AL_FINAL;
  return [...items].sort((a, b) => (esMotion(a) ? 1 : 0) - (esMotion(b) ? 1 : 0));
}
