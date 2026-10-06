//seccion del panel admin para ver los mensajes del formulario de contacto como chats
//primero se muestra la lista de conversaciones (una por persona), como en instagram:
//nombre, cantidad y el ultimo mensaje. al tocar una se abre el hilo completo
//dentro del hilo se puede responder: la respuesta queda como burbuja propia del chat
//depende de una sesion ya iniciada (el componente principal le pasa la clave y el nombre)
import { useCallback, useEffect, useState } from 'react';
import {
  obtenerConversaciones,
  borrarMensaje,
  responderConversacion,
} from '../api/mensajes.js';
import Loading from './Loading.jsx';

//mensaje de error para saber si el problema fue la clave (401) o algo mas
function claveIncorrecta(error) {
  return /401/.test(error.message);
}

//convierte la fecha de la base a un texto corto y legible (ej: 19/09/2026)
function formatearFecha(fechaISO) {
  const fecha = new Date(fechaISO);
  if (Number.isNaN(fecha.getTime())) return '';
  return fecha.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

//para la lista de chats: "Hoy", "Ayer" o la fecha corta segun corresponda
function formatearChat(fechaISO) {
  const fecha = new Date(fechaISO);
  if (Number.isNaN(fecha.getTime())) return '';
  const hoy = new Date();
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const inicioMensaje = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  const dias = Math.round((inicioHoy - inicioMensaje) / 86400000);
  if (dias <= 0) return 'Hoy';
  if (dias === 1) return 'Ayer';
  if (dias < 7) return fecha.toLocaleDateString('es-AR', { weekday: 'short' });
  return formatearFecha(fechaISO);
}

//fecha y hora para un mensaje dentro del hilo (ej: 19/09/2026 14:32)
function formatearHora(fechaISO) {
  const fecha = new Date(fechaISO);
  if (Number.isNaN(fecha.getTime())) return '';
  return fecha.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

//avatar circular con la inicial de la persona (como las fotos de los chats)
function AvatarInicial({ nombre, className }) {
  const saludo = nombre || 'Contacto';
  const inicial = saludo.trim()[0]?.toUpperCase() ?? '?';
  return (
    <span
      aria-hidden="true"
      className={`inline-flex items-center justify-center rounded-full bg-violeta-app text-black font-bold ${className}`}
    >
      {inicial}
    </span>
  );
}

//icono de flecha para volver de un chat a la lista
function FlechaAtras({ className }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  );
}

export default function AdminMensajes({ clave, nombre = 'Agustina Ferraro', alCambiar }) {
  const [conversaciones, setConversaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  //chat abierto: la conversacion completa que se esta viendo (null = lista)
  const [chat, setChat] = useState(null);
  //texto de la respuesta del hilo abierto
  const [respuesta, setRespuesta] = useState('');

  const cargar = useCallback(() => {
    setCargando(true);
    setError(null);
    obtenerConversaciones(clave)
      .then(setConversaciones)
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  }, [clave]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function abrirChat(conversacion) {
    setChat(conversacion);
    setError(null);
    setRespuesta('');
  }

  function volverAlista() {
    setChat(null);
    setRespuesta('');
    //se recarga para que el ultimo mensaje muestre la respuesta si se envio una
    cargar();
    if (alCambiar) alCambiar();
  }

  async function borrarUnMensaje(mensaje) {
    if (!window.confirm(`¿Borrar el mensaje de ${chat.nombre}?`)) return;
    setError(null);
    try {
      await borrarMensaje(mensaje._id, clave);
      const nuevos = chat.mensajes.filter((m) => m._id !== mensaje._id);
      if (nuevos.length === 0) {
        //si no queda ninguno, se cierra el chat y se recarga la lista
        setChat(null);
        cargar();
        if (alCambiar) alCambiar();
      } else {
        //la cantidad cuenta solo los mensajes de la persona, no las respuestas
        setChat({ ...chat, cantidad: nuevos.filter((m) => !m.esRespuesta).length, mensajes: nuevos });
      }
    } catch (e) {
      setError(e.message);
    }
  }

  //guarda la respuesta del admin dentro del chat y la muestra como burbuja propia
  async function enviarRespuesta(evento) {
    evento.preventDefault();
    const texto = respuesta.trim();
    if (!texto) return;
    setError(null);
    try {
      const cuerpo = await responderConversacion(chat._id, texto, nombre, clave);
      //el nuevo mensaje va primero porque el hilo esta ordenado de mas nuevo a mas viejo
      setChat({ ...chat, mensajes: [cuerpo.datos, ...chat.mensajes] });
      setRespuesta('');
    } catch (e) {
      setError(claveIncorrecta(e) ? 'La sesión expiró. Volvé a entrar.' : e.message);
    }
  }

  //arma el mail de respuesta con lo escrito (o un texto generico si esta vacio)
  function responderPorMail() {
    const texto = respuesta.trim();
    const asunto = `Re: tu mensaje en mi portfolio`;
    const cuerpo = texto || `Hola ${chat.nombre}, te respondo a tu consulta.`;
    window.open(
      `mailto:${chat.email}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`,
      '_blank'
    );
  }

  //hilo con los mensajes de una persona (burbujas de chat) y caja para responder
  if (chat) {
    const respuestas = chat.mensajes.filter((m) => m.esRespuesta).length;
    const claseRespuesta =
      'w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-verde-app transition-all resize-y';
    return (
      <section aria-label={`Chat con ${chat.nombre}`} className="space-y-4">
        <div className="flex items-center gap-3">
          {/*boton distinto al de la web: un chip verde con el texto "Chats"*/}
          <button
            type="button"
            onClick={volverAlista}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-verde-app text-verde-app hover:bg-verde-app hover:text-black transition-all duration-200 cursor-pointer"
          >
            <FlechaAtras className="w-4 h-4" />
            Chats
          </button>
          <AvatarInicial nombre={chat.nombre} className="w-11 h-11 text-lg shrink-0" />
          <div className="min-w-0">
            <p className="font-medium text-white truncate">{chat.nombre}</p>
            <a
              href={`mailto:${chat.email}`}
              className="text-sm text-verde-app hover:text-verde-app/80 transition-colors break-all"
            >
              {chat.email}
            </a>
          </div>
          <span className="ml-auto shrink-0 text-xs px-2 py-1 rounded-full bg-verde-app/10 text-verde-app border border-verde-app/20">
            {chat.cantidad} mensaje{chat.cantidad === 1 ? '' : 's'}
            {respuestas > 0 && (
              <>
                {' · '}
                {respuestas} respuesta{respuestas === 1 ? '' : 's'}
              </>
            )}
          </span>
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-400">
            {error}
          </p>
        )}

        <ul className="space-y-2">
          {chat.mensajes.map((mensaje) => (
            <li key={mensaje._id} className={mensaje.esRespuesta ? 'flex justify-end' : ''}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  mensaje.esRespuesta
                    ? 'bg-violeta-app/15 border border-violeta-app/30'
                    : 'bg-zinc-900 border border-zinc-800'
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  {mensaje.esRespuesta ? (
                    <span className="text-xs text-violeta-app">Tu respuesta</span>
                  ) : (
                    <span className="text-xs text-zinc-500">{formatearHora(mensaje.createdAt)}</span>
                  )}
                  {mensaje.esRespuesta ? (
                    <span className="text-xs text-zinc-500">{formatearHora(mensaje.createdAt)}</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => borrarUnMensaje(mensaje)}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      Borrar
                    </button>
                  )}
                </div>
                <p className="text-zinc-200 text-sm mt-1 leading-relaxed whitespace-pre-line">{mensaje.mensaje}</p>
              </div>
            </li>
          ))}
        </ul>

        <form onSubmit={enviarRespuesta} className="space-y-2 pt-2 border-t border-zinc-800">
          <label htmlFor="admin-respuesta" className="block text-sm text-zinc-300">
            Responder en este chat
          </label>
          <textarea
            id="admin-respuesta"
            value={respuesta}
            onChange={(e) => setRespuesta(e.target.value)}
            placeholder="Escribí tu respuesta..."
            rows={3}
            className={claseRespuesta}
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={responderPorMail}
              className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white active:scale-95 hover:scale-105 transition-all duration-200"
            >
              Responder por mail
            </button>
            <button
              type="submit"
              disabled={!respuesta.trim()}
              className="px-4 py-2 rounded-lg font-medium bg-violeta-app hover:bg-violeta-app/90 text-black transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Enviar respuesta
            </button>
          </div>
        </form>
      </section>
    );
  }

  //lista de conversaciones (como la bandeja de un chat)
  return (
    <section aria-label="Mensajes recibidos" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">
          Mensajes{' '}
          {conversaciones.length > 0 && (
            <span className="ml-1 text-sm font-normal text-zinc-500">({conversaciones.length})</span>
          )}
        </h2>
        <button type="button" onClick={cargar} className="inline-block rounded-lg px-2 py-1 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white active:scale-95 hover:scale-105 transition-all duration-200">
          Refrescar
        </button>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}

      {cargando ? (
        <Loading claseContenedor="h-48" />
      ) : conversaciones.length === 0 ? (
        <div className="p-10 rounded-2xl bg-zinc-900 border border-zinc-800 text-center">
          <p className="text-zinc-400">Todavía no recibiste ningún mensaje.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {conversaciones.map((conversacion) => {
            const ultimo = conversacion.mensajes[0];
            const textoUltimo = ultimo?.esRespuesta ? `Tú: ${ultimo.mensaje}` : ultimo?.mensaje ?? '';
            return (
              <li key={conversacion._id}>
                <button
                  type="button"
                  onClick={() => abrirChat(conversacion)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-verde-app/50 hover:scale-[1.01] active:scale-100 transition-all cursor-pointer text-left"
                >
                  <AvatarInicial nombre={conversacion.nombre} className="w-11 h-11 text-lg shrink-0" />
                  <span className="flex-1 min-w-0">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="font-medium text-white truncate">{conversacion.nombre}</span>
                      <span className="text-xs text-zinc-500 shrink-0">{formatearChat(conversacion.ultimaFecha)}</span>
                    </span>
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-sm text-zinc-400 truncate">{textoUltimo}</span>
                      <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-violeta-app text-black font-medium">
                        {conversacion.cantidad}
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}