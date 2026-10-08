//capa de datos: funciones para los mensajes de contacto
import { peticionGET, peticionGETAutenticada, peticionConToken, peticionAdmin } from './client.js';

//envia un mensaje del formulario de contacto (con la sesion de la cuenta)
//datos = { mensaje }; el nombre y el email salen del token en el backend
export function enviarMensaje(datos, token) {
  return peticionConToken('/api/mensajes', datos, token);
}

//devuelve la conversacion de la persona logueada (sus mensajes y las respuestas del admin)
//usa el token de sesion de la cuenta, por eso no hace falta el token secreto del chat
export function obtenerMensajesMios(token) {
  return peticionGETAutenticada('/api/mensajes/mio', token);
}

//devuelve la conversacion publica del visitante (mecanismo viejo, sin cuenta)
//usa el token secreto que se genero al enviar el primer mensaje
export function obtenerMensajesPublicos(email, token) {
  return peticionGET(
    `/api/mensajes/publico/${encodeURIComponent(email)}?token=${encodeURIComponent(token)}`
  );
}

//devuelve los mensajes agrupados por persona (como chats, solo la dueña del sitio)
export function obtenerConversaciones() {
  return peticionAdmin('GET', '/api/mensajes/conversaciones');
}

//guarda una respuesta del dueño del portfolio dentro del chat de una persona (solo la dueña)
//email es el id de la conversacion (el email en minusculas de esa persona)
export function responderConversacion(email, respuesta, nombre) {
  return peticionAdmin(
    'POST',
    `/api/mensajes/conversaciones/${encodeURIComponent(email)}/respuesta`,
    { respuesta, nombre }
  );
}

//borra un mensaje (solo la dueña del sitio)
export function borrarMensaje(id) {
  return peticionAdmin('DELETE', `/api/mensajes/${id}`);
}
