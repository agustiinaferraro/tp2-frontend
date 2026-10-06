//capa de datos: integracion con behance (videos de los proyectos en el hero)
import { peticionGET, peticionAdmin } from './client.js';

//resuelve el mp4 actual de un video de adobe ccv (la url firmada expira, se pide fresca)
export function urlVideoCcV(ccv) {
  return peticionGET(`/api/behance/video?ccv=${encodeURIComponent(ccv)}`);
}

//dispara la sincronizacion con behance (proyectos nuevos + videos) desde el panel admin
export function sincronizarBehance(clave) {
  return peticionAdmin('POST', '/api/behance/sincronizar', {}, clave);
}