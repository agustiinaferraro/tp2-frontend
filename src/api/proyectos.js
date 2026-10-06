//capa de datos: funciones para consultar proyectos y gestionar los del admin
import { peticionGET, peticionPOST, peticionAdmin } from './client.js';

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

//verifica si el usuario y la clave de administrador son correctos
export function verificarClave(usuario, clave) {
  return peticionPOST('/api/admin/verificar', { usuario, clave });
}

//crea un proyecto nuevo (solo admin)
export function crearProyecto(datos, clave) {
  return peticionAdmin('POST', '/api/proyectos', datos, clave);
}

//actualiza un proyecto existente (solo admin)
export function actualizarProyecto(id, datos, clave) {
  return peticionAdmin('PUT', `/api/proyectos/${id}`, datos, clave);
}

//borra un proyecto (solo admin)
export function borrarProyecto(id, clave) {
  return peticionAdmin('DELETE', `/api/proyectos/${id}`, undefined, clave);
}