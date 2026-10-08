//capa de datos del perfil: consultar el perfil publico y actualizarlo desde el panel
import { peticionGET, peticionAdmin } from './client.js';

//trae el perfil de la persona (nombre, titulo, foto, contacto y redes)
//como el backend lo crea solo si no existe, siempre devuelve datos
export function obtenerPerfil() {
  return peticionGET('/api/perfil');
}

//guarda los datos del perfil (solo la dueña del sitio)
export function actualizarPerfil(datos) {
  return peticionAdmin('PUT', '/api/perfil', datos);
}
