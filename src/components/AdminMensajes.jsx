//seccion de la dueña para ver los mensajes del formulario de contacto como chats
//primero se muestra la lista de conversaciones (una por cuenta/persona), como en whatsapp:
//nombre de la persona, el ultimo mensaje, la hora y la cantidad de mensajes que mando
//al tocar una se abre el hilo completo (burbujas) y se puede responder
//la lista se refresca sola cada pocos segundos (no hace falta boton de refrescar)
//depende de una sesion ya iniciada por la dueña del sitio
import { useCallback, useEffect, useState } from 'react';
import {
  obtenerConversaciones,
  borrarMensaje,
  responderConversacion,
} from '../api/mensajes.js';
import Loading from './Loading.jsx';

//cada cuanto se vuelve a pedir la lista para ver si llego algo nuevo (en milisegundos)
const INTERVALO_REFRESCO = 5000;

//reconoce el error 401: la sesion vencio y hay que volver a entrar
function claveIncorrecta(error) {
  return error.status === 401;
}

//convierte la fecha de la base a un texto corto y legible (ej: 19/09/2026)
function formatearFecha(fechaISO) {
  const fecha = new Date(fechaISO);
  if (Number.isNaN(fecha.getTime())) return '';
  return fecha.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

//para la lista de chats: "Hoy", "Ayer" o la fecha corta segun corresponda (como whatsapp)
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

//hora corta para un mensaje dentro del hilo (ej: 14:32)
function formatearHora(fechaISO) {
  const fecha = new Date(fechaISO);
  if (Number.isNaN(fecha.getTime())) return '';
  return fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

//avatar circular con la inicial de la persona (como las fotos de los chats)
function AvatarInicial({ nombre, className }) {
  const saludo = nombre || 'Contacto';
  const inicial = saludo.trim()[0]?.toUpperCase() ?? '?';
  return (
    <span
      aria-hidden="true"
      className={`inline-flex items-center justify-center rounded-full bg-violeta-app text-black font-bold shrink-0 ${className}`}
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

//icono de enviar (avioncito), como el boton de mandar de whatsapp
function IconoEnviar({ className }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}

export default function AdminMensajes({ nombre = 'Agustina Ferraro', alCambiar, sinEncabezado = false }) {
  const [conversaciones, setConversaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  //chat abierto: la conversacion completa que se esta viendo (null = lista)
  const [chat, setChat] = useState(null);
  //texto de la respuesta del hilo abierto
  const [respuesta, setRespuesta] = useState('');
  //true mientras se envia la respuesta (deshabilita el boton)
  const [enviando, setEnviando] = useState(false);

  //trae las conversaciones. silencioso=true para el refresco automatico
  //(no muestra el spinner ni pisa la pantalla mientras el usuario lee)
  const cargar = useCallback((silencioso = false) => {
    if (!silencioso) setCargando(true);
    setError(null);
    obtenerConversaciones()
      .then(setConversaciones)
      .catch((e) => setError(e.message))
      .finally(() => {
        if (!silencioso) setCargando(false);
      });
  }, []);

  //carga inicial + refresco automatico cada pocos segundos
  useEffect(() => {
    cargar();
    const id = setInterval(() => cargar(true), INTERVALO_REFRESCO);
    return () => clearInterval(id);
  }, [cargar]);

  //mantiene el chat abierto al dia: si entra un mensaje nuevo se actualiza solo
  useEffect(() => {
    if (!chat) return;
    const fresco = conversaciones.find((c) => c._id === chat._id);
    if (!fresco) return;
    if (fresco.mensajes.length !== chat.mensajes.length || fresco.ultimaFecha !== chat.ultimaFecha) {
      setChat(fresco);
    }
  }, [conversaciones, chat]);

  function abrirChat(conversacion) {
    setChat(conversacion);
    setError(null);
    setRespuesta('');
  }

  function volverAlista() {
    setChat(null);
    setRespuesta('');
    //se recarga para que la lista muestre la respuesta recien enviada
    cargar(true);
    if (alCambiar) alCambiar();
  }

  async function borrarUnMensaje(mensaje) {
    if (!window.confirm(`¿Borrar el mensaje de ${chat.nombre}?`)) return;
    setError(null);
    try {
      await borrarMensaje(mensaje._id);
      const nuevos = chat.mensajes.filter((m) => m._id !== mensaje._id);
      if (nuevos.length === 0) {
        //si no queda ninguno, se cierra el chat y se recarga la lista
        setChat(null);
        cargar(true);
        if (alCambiar) alCambiar();
      } else {
        //la cantidad cuenta solo los mensajes de la persona, no las respuestas
        setChat({ ...chat, cantidad: nuevos.filter((m) => !m.esRespuesta).length, mensajes: nuevos });
      }
    } catch (e) {
      setError(e.message);
    }
  }

  //guarda la respuesta de la dueña dentro del chat y la muestra como burbuja propia
  async function enviarRespuesta(evento) {
    evento.preventDefault();
    const texto = respuesta.trim();
    if (enviando || !texto) return;
    setEnviando(true);
    setError(null);
    try {
      const cuerpo = await responderConversacion(chat._id, texto, nombre);
      //el nuevo mensaje va primero porque el hilo esta ordenado de mas nuevo a mas viejo
      setChat({ ...chat, mensajes: [cuerpo.datos, ...chat.mensajes] });
      setRespuesta('');
    } catch (e) {
      setError(claveIncorrecta(e) ? 'La sesión expiró. Volvé a entrar.' : e.message);
    } finally {
      setEnviando(false);
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

  //hilo con los mensajes de una persona (burbujas estilo whatsapp) y caja para responder
  if (chat) {
    const respuestas = chat.mensajes.filter((m) => m.esRespuesta).length;
    return (
      <section aria-label={`Chat con ${chat.nombre}`} className="space-y-3 text-left">
        {/*cabecera del chat: volver, avatar, nombre y email*/}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-900 border border-zinc-800">
          <button
            type="button"
            onClick={volverAlista}
            aria-label="Volver a la lista de chats"
            className="inline-flex items-center justify-center w-9 h-9 rounded-full text-zinc-300 hover:bg-zinc-800 hover:text-white active:scale-95 transition-all duration-200 cursor-pointer shrink-0"
          >
            <FlechaAtras className="w-5 h-5" />
          </button>
          <AvatarInicial nombre={chat.nombre} className="w-10 h-10 text-base" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-white truncate leading-tight">{chat.nombre}</p>
            <a
              href={`mailto:${chat.email}`}
              className="text-xs text-zinc-400 hover:text-verde-app transition-colors break-all"
            >
              {chat.email}
            </a>
          </div>
          <span className="shrink-0 text-xs px-2 py-1 rounded-full bg-whatsapp/15 text-whatsapp border border-whatsapp/25">
            {chat.cantidad} enviado{chat.cantidad === 1 ? '' : 's'}
            {respuestas > 0 && <> · {respuestas} tuyo{respuestas === 1 ? '' : 's'}</>}
          </span>
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-400 px-1">
            {error}
          </p>
        )}

        {/*hilo de mensajes: lo que manda la persona a la izquierda (gris)
            y lo que responde la dueña a la derecha (verde, como whatsapp)*/}
        <ul className="space-y-2 max-h-[60vh] overflow-y-auto p-3 rounded-2xl bg-zinc-950/60 border border-zinc-800">
          {chat.mensajes.map((mensaje) => (
            <li key={mensaje._id} className={mensaje.esRespuesta ? 'flex justify-end' : 'flex justify-start'}>
              <div
                className={`group max-w-[80%] rounded-2xl px-3.5 py-2 shadow-sm ${
                  mensaje.esRespuesta
                    ? 'bg-whatsapp text-black rounded-br-sm'
                    : 'bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-bl-sm'
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-line break-words m-0">{mensaje.mensaje}</p>
                <div className={`flex items-center gap-2 mt-0.5 ${mensaje.esRespuesta ? 'justify-end' : 'justify-between'}`}>
                  <span className={`text-[10px] ${mensaje.esRespuesta ? 'text-black/60' : 'text-zinc-500'}`}>
                    {formatearHora(mensaje.createdAt)}
                  </span>
                  {!mensaje.esRespuesta && (
                    <button
                      type="button"
                      onClick={() => borrarUnMensaje(mensaje)}
                      className="text-[10px] text-red-400 hover:text-red-300 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                    >
                      Borrar
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>

        {/*caja para responder (como la barra de escritura de whatsapp)*/}
        <form onSubmit={enviarRespuesta} className="flex items-center gap-2">
          <label htmlFor="admin-respuesta" className="sr-only">
            Responder en este chat
          </label>
          <input
            id="admin-respuesta"
            type="text"
            value={respuesta}
            onChange={(e) => setRespuesta(e.target.value)}
            placeholder="Escribí un mensaje..."
            className="flex-1 px-4 py-2.5 rounded-full bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-whatsapp transition-all"
          />
          <button
            type="submit"
            disabled={enviando || !respuesta.trim()}
            aria-label="Enviar respuesta"
            className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-whatsapp hover:bg-whatsapp-claro text-black transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 cursor-pointer shrink-0"
          >
            <IconoEnviar className="w-5 h-5 -ml-0.5" />
          </button>
        </form>
        <button
          type="button"
          onClick={responderPorMail}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-1"
        >
          Responder por mail
        </button>
      </section>
    );
  }

  //lista de conversaciones (la bandeja de chats)
  return (
    <section aria-label="Chats" className="space-y-3 text-left">
      {!sinEncabezado && (
        <h2 className="text-lg font-semibold text-white">
          Chats{' '}
          {conversaciones.length > 0 && (
            <span className="ml-1 text-sm font-normal text-zinc-500">({conversaciones.length})</span>
          )}
        </h2>
      )}

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
        <ul className="space-y-1.5">
          {conversaciones.map((conversacion) => {
            const ultimo = conversacion.mensajes[0];
            const textoUltimo = ultimo?.esRespuesta ? `Tú: ${ultimo.mensaje}` : ultimo?.mensaje ?? '';
            return (
              <li key={conversacion._id}>
                <button
                  type="button"
                  onClick={() => abrirChat(conversacion)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-whatsapp/40 hover:bg-zinc-800/60 active:scale-[0.99] transition-all cursor-pointer text-left"
                >
                  <AvatarInicial nombre={conversacion.nombre} className="w-12 h-12 text-lg" />
                  <span className="flex-1 min-w-0">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="font-semibold text-white truncate">{conversacion.nombre}</span>
                      <span className="text-[11px] text-zinc-500 shrink-0">{formatearChat(conversacion.ultimaFecha)}</span>
                    </span>
                    <span className="flex items-center justify-between gap-3 mt-0.5">
                      <span className="text-sm text-zinc-400 truncate">{textoUltimo}</span>
                      {conversacion.cantidad > 0 && (
                        <span className="shrink-0 min-w-[20px] text-center text-xs px-1.5 py-0.5 rounded-full bg-whatsapp text-black font-semibold">
                          {conversacion.cantidad}
                        </span>
                      )}
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
