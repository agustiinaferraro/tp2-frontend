//capa de datos para los comentarios de los proyectos
import { peticionGET, peticionConToken } from './client.js';

//devuelve la lista de comentarios de un proyecto (publico)
export function obtenerComentarios(proyectoId) {
  return peticionGET(`/api/comentarios/${proyectoId}`);
}

//publica un comentario (pide estar logueado: se manda el token de sesion)
export function publicarComentario(proyectoId, texto, token) {
  return peticionConToken('/api/comentarios', { proyecto: proyectoId, texto }, token);
}