//utilidades de los proyectos: detectar de que tipo es cada uno y que imagen conviene mostrar
//las de behance muestran la imagen que se subio al propio behance
//las de desarrollo (desplegadas en vercel) se intenta mostrar:
//  1) una foto real que se haya subido del proyecto (esa gana siempre)
//  2) la captura en vivo del deploy (thum.io), como segunda opcion

//los svg del importador son placeholders automaticos: sirven de ultima recurso, nunca de portada
export function esPlaceholder(imagen) {
  return typeof imagen !== 'string' || /^data:image\/svg\+xml/i.test(imagen);
}

//un proyecto es de behance si su link es la galeria publicada en behance
export function esBehance(proyecto) {
  return /behance\.net\/gallery\//i.test(proyecto?.link ?? '');
}

//un proyecto es de desarrollo si apunta a un deploy (vercel, netlify, github pages, etc)
export function esDespliegue(proyecto) {
  const link = proyecto?.link ?? '';
  if (!/^https?:\/\//i.test(link)) return false;
  if (esBehance(proyecto)) return false;
  return !/github\.com\//i.test(link);
}

// mejora la resolucion de las portadas de behance: pasa de 404 (miniatura) a 808 (mas nitida)

export function mejorarImagenBehance(imagen) {
  if (typeof imagen !== 'string') return imagen;
  return imagen.replace('/projects/404/', '/projects/808/');
}

// url de la captura de pantalla del deploy, para usar de miniatura antes de entrar al sitio
export function urlCaptura(link) {
  if (!link) return null;
  return `https://image.thum.io/get/width/1200/crop/750/${link}`;
}

//primera foto real que tenga el proyecto (sirve para behance y para los deploys con captura propia)
function fotoReal(proyecto) {
  return [proyecto?.imagen, ...(proyecto?.imagenes ?? [])].find((img) => img && !esPlaceholder(img)) ?? null;
}

//imagen que mejor representa al proyecto:
  //  1) una foto real subida a mano (siempre gana, es la mejor minima)
  //  2) en los deploys, la captura en vivo del sitio
  //  3) el svg autogenerado del importador, como ultima recurso
  export function imagenPreferida(proyecto) {
    if (!proyecto) return null;
    const foto = fotoReal(proyecto);
    if (foto) return mejorarImagenBehance(foto);
    if (esDespliegue(proyecto)) return urlCaptura(proyecto.link);
    return mejorarImagenBehance(proyecto.imagen || proyecto.imagenes?.[0] || null);
  }

//gif animado que tenga el proyecto (behance publica las animaciones cortas como gif, sin
//marcarlas como "video"): primero se mira la portada y despues la galeria de behance, para
//que un gif que no quedo de portada igual se vea moviendose en las tarjetas y en el hero
export function gifDeProyecto(proyecto) {
  const candidatas = [proyecto?.imagen, ...(proyecto?.imagenes ?? []), ...(proyecto?.imagenesBehance ?? [])];
  return candidatas.find((img) => typeof img === 'string' && /\.gif(?:\?\S*)?$/i.test(img)) ?? null;
}

//true si hay algo que mostrar del proyecto (video, gif animado o imagen): el hero lo usa
//para no meter proyectos de categoria de video a los que behance no les entrega ningun
//medio, porque ahi no habria nada que rotar y se veria un cuadro negro
export function tieneMedio(proyecto) {
  if (!proyecto) return false;
  if (proyecto.video?.trim()) return true;
  if (gifDeProyecto(proyecto)) return true;
  return Boolean(imagenPreferida(proyecto));
}

//galeria de imagenes del proyecto, empezando siempre por la que mejor lo representa:
//las fotos reales subidas van primero, despues la galeria completa que trae de behance
//(en el orden original de behance) y la captura en vivo del deploy queda al final,
//como ultima alternativa (ademas es la que suele salir en negro si el deploy no carga).
//los proyectos con video no llevan imagen extra: en behance el video ocupa ese lugar y la
//portada es solo un cover automatico que behance genera (no es una imagen del proyecto), asi
//que ahi la galeria se arma unicamente con las imagenes que behance tiene publicadas de verdad
export function galeriaProyecto(proyecto) {
  if (!proyecto) return [];
  const conVideo = Boolean(proyecto?.video?.trim());
  const propia = conVideo
    ? []
    : [proyecto.imagen, ...(proyecto?.imagenes ?? [])]
        .filter(Boolean)
        .map((img) => mejorarImagenBehance(img));
  const behance = (proyecto?.imagenesBehance ?? []).filter(Boolean);
  const captura = !conVideo && esDespliegue(proyecto) ? urlCaptura(proyecto.link) : null;
  return [...propia, ...behance, captura]
    .filter((img, i, lista) => img && lista.indexOf(img) === i && !esPlaceholder(img));
}

//titulo del boton principal del detalle, segun de donde venga el proyecto
export function textoVisitar(proyecto) {
  if (esBehance(proyecto)) return 'Ver proyecto completo';
  if (esDespliegue(proyecto)) return 'Ver proyecto completo';
  return 'Ver proyecto completo';
}