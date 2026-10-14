//capa de datos: funciones para los mensajes de contacto
import { peticionGET, peticionGETAutenticada, peticionConToken, peticionAdmin } from './client.js';

//envia un mensaje del formulario de contacto (con la sesion de la cuenta)
//datos = { mensaje, telefono? }; el nombre y el email salen del token en el backend
export function enviarMensaje(datos, token) {
  return peticionConToken('/api/mensajes', datos, token);
}

//guarda el whatsapp de la persona en su conversacion (para que la admin le responda por ahi)
export function guardarTelefono(telefono, token) {
  return peticionConToken('/api/mensajes/telefono', { telefono }, token);
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

//marca los mensajes de esa persona como leidos (solo la admin): el contador de la lista
//desaparece hasta que llegue un mensaje nuevo
export function marcarComoLeido(email) {
  return peticionAdmin(
    'POST',
    `/api/mensajes/conversaciones/${encodeURIComponent(email)}/leer`
  );
}

//guarda una respuesta dentro del chat de una persona (solo la admin)
//email es el id de la conversacion (el email en minusculas de esa persona)
//porWhatsapp=true marca la respuesta como enviada por whatsapp (el visitante lo ve)
export function responderConversacion(email, respuesta, nombre, porWhatsapp = false) {
  return peticionAdmin(
    'POST',
    `/api/mensajes/conversaciones/${encodeURIComponent(email)}/respuesta`,
    { respuesta, nombre, porWhatsapp }
  );
}

//borra un mensaje (solo la dueña del sitio)
export function borrarMensaje(id) {
  return peticionAdmin('DELETE', `/api/mensajes/${id}`);
}

//borra una conversacion completa (todo el chat de esa persona) - solo la dueña
//email es el id de la conversacion (el email normalizado de esa persona)
export function borrarConversacion(email) {
  return peticionAdmin('DELETE', `/api/mensajes/conversaciones/${encodeURIComponent(email)}`);
}
