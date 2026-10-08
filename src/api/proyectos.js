//capa de datos: funciones para consultar proyectos y gestionar los del admin
import { peticionGET, peticionAdmin } from './client.js';

//devuelve todos los proyectos
export function obtenerProyectos() {
  return peticionGET('/api/proyectos');
}

//devuelve solo los proyectos destacados
export function obtenerProyectosDestacados() {
  return peticionGET('/api/proyectos?destacados=true');
}

//devuelve los proyectos sin imagenes (para el buscador, asi la carga es liviana)
export function obtenerProyectosLigeros() {
  return peticionGET('/api/proyectos?ligero=true');
}

//devuelve los proyectos de una categoria (slug del servicio, ej. diseno-grafico-identidad)
export function obtenerProyectosPorServicio(slug) {
  return peticionGET(`/api/proyectos?servicio=${encodeURIComponent(slug)}`);
}

//devuelve un solo proyecto segun su id (para la pagina de detalle)
export function obtenerProyectoPorId(id) {
  return peticionGET(`/api/proyectos/${encodeURIComponent(id)}`);
}

//crea un proyecto nuevo (solo la dueña del sitio)
export function crearProyecto(datos) {
  return peticionAdmin('POST', '/api/proyectos', datos);
}

//actualiza un proyecto existente (solo la dueña del sitio)
export function actualizarProyecto(id, datos) {
  return peticionAdmin('PUT', `/api/proyectos/${id}`, datos);
}

//borra un proyecto (solo la dueña del sitio)
export function borrarProyecto(id) {
  return peticionAdmin('DELETE', `/api/proyectos/${id}`);
}
