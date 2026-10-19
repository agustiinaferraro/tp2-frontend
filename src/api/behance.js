//capa de datos: integracion con behance (videos de los proyectos en el hero y en las tarjetas)
import { peticionGET } from './client.js';

//cache de la sesion: el hero, la grilla y los destacados piden el mismo mp4 del mismo
//proyecto; sin esto cada tarjeta dispararia su propia llamada y con la conexion lenta se
//veria el mismo video resolverse en todos lados a la vez
const resueltos = new Map();

//resuelve el mp4 actual de un video de adobe ccv (la url firmada expira, se pide fresca)
export function urlVideoCcV(ccv) {
  if (!resueltos.has(ccv)) {
    resueltos.set(
      ccv,
      peticionGET(`/api/behance/video?ccv=${encodeURIComponent(ccv)}`).catch((error) => {
        //sin wifi o con la api caida no se guarda el resultado: el cache tendria que
        //olvidar el fallo para poder reintentar cuando vuelva la conexion
        resueltos.delete(ccv);
        throw error;
      }),
    );
  }
  return resueltos.get(ccv);
}
