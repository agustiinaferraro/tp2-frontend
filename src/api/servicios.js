//capa de datos: funciones para consultar los servicios
import { peticionGET, peticionAdmin } from './client.js';

//devuelve la lista de servicios cargados en la base de datos
export function obtenerServicios() {
  return peticionGET('/api/servicios');
}

//crea una categoria nueva desde el panel de admin (solo admin)
//si ya existe con ese nombre, la api devuelve la existente
export function crearServicio(nombre, descripcion, clave) {
  return peticionAdmin('POST', '/api/servicios', { nombre, descripcion }, clave);
}

//devuelve un solo servicio segun su slug (ej. diseno-ux-ui)
export function obtenerServicioPorSlug(slug) {
  return peticionGET(`/api/servicios/${slug}`);
}