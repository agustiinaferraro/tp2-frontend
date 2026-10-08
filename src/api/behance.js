//capa de datos: integracion con behance (videos de los proyectos en el hero)
import { peticionGET } from './client.js';

//resuelve el mp4 actual de un video de adobe ccv (la url firmada expira, se pide fresca)
export function urlVideoCcV(ccv) {
  return peticionGET(`/api/behance/video?ccv=${encodeURIComponent(ccv)}`);
}
