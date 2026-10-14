//seccion de la dueña para ver los mensajes del formulario de contacto como chats
//primero se muestra la lista de conversaciones (una por cuenta/persona), como en whatsapp:
//nombre de la persona, el ultimo mensaje, la hora y la cantidad de mensajes sin leer
//al tocar una se abre el hilo completo (burbujas) y se puede responder
//los mensajes se ven en orden cronologico: el mas viejo arriba y el nuevo abajo (como whatsapp)
//se puede borrar un mensaje suelto o el chat entero
//la lista se refresca sola cada pocos segundos (no hace falta boton de refrescar)
//depende de una sesion ya iniciada por la dueña del sitio
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  obtenerConversaciones,
  marcarComoLeido,
  borrarMensaje,
  borrarConversacion,
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

//el backend manda los mensajes del mas nuevo al mas viejo; aca se dan vuelta a cronologico
//(el primero que mando la persona arriba y el ultimo abajo), como se lee una charla
function ordenarConversacion(conversacion) {
  return {
    ...conversacion,
    mensajes: [...conversacion.mensajes].sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    ),
  };
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

//icono de tacho de basura para eliminar un chat
function IconoBasura({ className }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

//icono de whatsapp: se usa para responderle a la persona por whatsapp
function IconoWhatsapp({ className = 'w-5 h-5' }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.01-1.04 2.47s1.06 2.86 1.21 3.06c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.28.17-1.41-.07-.13-.27-.2-.57-.35z"></path>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.87 9.87 0 0 0 4.79 1.22h.01c5.46 0 9.9-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.17 8.17 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.25-8.23 2.2 0 4.27.86 5.83 2.42a8.19 8.19 0 0 1 2.41 5.82c0 4.54-3.7 8.23-8.24 8.23"></path>
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
  //referencia al final del hilo para bajar el scroll cuando llega o se manda un mensaje
  const finDelHiloRef = useRef(null);

  //trae las conversaciones. silencioso=true para el refresco automatico
  //(no muestra el spinner ni pisa la pantalla mientras el usuario lee)
  const cargar = useCallback((silencioso = false) => {
    if (!silencioso) setCargando(true);
    setError(null);
    obtenerConversaciones()
      .then((lista) => setConversaciones(lista.map(ordenarConversacion)))
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
  //y queda marcado como leido (la persona lo esta viendo en este momento)
  useEffect(() => {
    if (!chat) return;
    const fresco = conversaciones.find((c) => c._id === chat._id);
    if (!fresco) return;
    if (fresco.mensajes.length !== chat.mensajes.length || fresco.ultimaFecha !== chat.ultimaFecha) {
      marcarComoLeido(chat.email).catch(() => {});
      setChat({
        ...fresco,
        cantidad: 0,
        mensajes: fresco.mensajes.map((m) =>
          m.esRespuesta ? m : { ...m, leidoEn: m.leidoEn ?? new Date().toISOString() }
        ),
      });
    }
  }, [conversaciones, chat]);

  //baja el scroll al final cada vez que se abre un chat o entra/manda un mensaje
  useEffect(() => {
    const caja = finDelHiloRef.current;
    if (caja) caja.scrollTop = caja.scrollHeight;
  }, [chat?._id, chat?.mensajes.length]);

  function abrirChat(conversacion) {
    //al abrir el chat los mensajes quedan como leidos: se avisa al backend y ademas se
    //refleja al toque en el estado local (el contador de la lista baja a cero)
    marcarComoLeido(conversacion.email).catch(() => {});
    setChat({
      ...conversacion,
      cantidad: 0,
      mensajes: conversacion.mensajes.map((m) =>
        m.esRespuesta ? m : { ...m, leidoEn: m.leidoEn ?? new Date().toISOString() }
      ),
    });
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
        //la cantidad cuenta solo los mensajes de la persona que queden sin leer
        setChat({
          ...chat,
          cantidad: nuevos.filter((m) => !m.esRespuesta && !m.leidoEn).length,
          mensajes: nuevos,
        });
      }
    } catch (e) {
      setError(e.message);
    }
  }

  //elimina la conversacion completa (todo el chat con esa persona)
  async function borrarChat(conversacion) {
    if (!window.confirm(`¿Eliminar todo el chat con ${conversacion.nombre}? No se puede deshacer.`)) return;
    setError(null);
    try {
      await borrarConversacion(conversacion._id);
      //si era el chat abierto, se vuelve a la lista
      if (chat?._id === conversacion._id) {
        setChat(null);
        setRespuesta('');
      }
      cargar(true);
      if (alCambiar) alCambiar();
    } catch (e) {
      setError(e.message);
    }
  }

  //guarda la respuesta dentro del chat y la muestra como burbuja propia
  //porWhatsapp=true: ademas se abre whatsapp con el texto para que le llegue a su celular
  //(se abre antes del await porque despues el navegador bloquearia la ventana nueva)
  async function enviarRespuesta(evento, porWhatsapp = false) {
    evento.preventDefault();
    const texto = respuesta.trim();
    if (enviando || !texto) return;
    if (porWhatsapp && chat.telefono) {
      const link = `https://wa.me/${chat.telefono}?text=${encodeURIComponent(texto)}`;
      window.open(link, '_blank', 'noopener,noreferrer');
    }
    setEnviando(true);
    setError(null);
    try {
      const cuerpo = await responderConversacion(chat._id, texto, nombre, porWhatsapp);
      //la respuesta se agrega al final: queda debajo del mensaje que mando la persona
      setChat({ ...chat, mensajes: [...chat.mensajes, cuerpo.datos] });
      setRespuesta('');
    } catch (e) {
      setError(claveIncorrecta(e) ? 'La sesión expiró. Volvé a entrar.' : e.message);
    } finally {
      setEnviando(false);
    }
  }

  //hilo con los mensajes de una persona (burbujas estilo whatsapp) y caja para responder
  if (chat) {
    return (
      //alto fijo (como una ventana de chat): el header y la barra de escribir quedan fijos
      //y solo se desplaza la lista de mensajes de adentro
      <section
        aria-label={`Chat con ${chat.nombre}`}
        className="flex flex-col gap-3 h-[34rem] text-left"
      >
        {/*cabecera del chat: volver, avatar, nombre y email*/}
        <div className="shrink-0 flex items-center gap-3 p-3 rounded-2xl bg-zinc-900 border border-zinc-800">
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
            {/*si la persona dejo su whatsapp se muestra como link directo al chat*/}
            {chat.telefono && (
              <a
                href={`https://wa.me/${chat.telefono}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-whatsapp hover:underline transition-colors"
                title="Abrir este chat en WhatsApp"
              >
                <IconoWhatsapp className="w-3.5 h-3.5" />
                {chat.telefono}
              </a>
            )}
          </div>
        </div>

        {error && (
          <p role="alert" className="shrink-0 text-sm text-red-400 px-1">
            {error}
          </p>
        )}

        {/*hilo de mensajes (unico que hace scroll): lo que manda la persona a la izquierda (gris)
            y lo que responde la dueña a la derecha (verde, como whatsapp)*/}
        <ul
          ref={finDelHiloRef}
          className="flex-1 min-h-0 space-y-2 overflow-y-auto p-3 rounded-2xl bg-zinc-950/60 border border-zinc-800"
        >
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
        <form onSubmit={enviarRespuesta} className="shrink-0 flex items-center gap-2">
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
          {/*si la persona dejo su whatsapp: boton extra para que la respuesta le llegue a su celular*/}
          {chat.telefono && (
            <button
              type="button"
              onClick={(e) => enviarRespuesta(e, true)}
              disabled={enviando || !respuesta.trim()}
              aria-label="Enviar respuesta por WhatsApp"
              title="Enviar por WhatsApp"
              className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-whatsapp hover:bg-whatsapp-claro text-black transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 cursor-pointer shrink-0"
            >
              <IconoWhatsapp className="w-5 h-5" />
            </button>
          )}
          <button
            type="submit"
            disabled={enviando || !respuesta.trim()}
            aria-label="Enviar respuesta"
            className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 cursor-pointer shrink-0"
          >
            <IconoEnviar className="w-5 h-5 -ml-0.5" />
          </button>
        </form>
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
            const ultimo = conversacion.mensajes[conversacion.mensajes.length - 1];
            const textoUltimo = ultimo?.esRespuesta ? `Tú: ${ultimo.mensaje}` : ultimo?.mensaje ?? '';
            return (
              <li key={conversacion._id}>
                <div className="flex items-center gap-1 p-1.5 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-whatsapp/40 hover:bg-zinc-800/60 transition-all">
                  <button
                    type="button"
                    onClick={() => abrirChat(conversacion)}
                    className="flex-1 min-w-0 flex items-center gap-3 p-2 rounded-xl active:scale-[0.99] transition-all cursor-pointer text-left"
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
                  {/*elimina el chat entero (esta en la lista, no dentro del chat)*/}
                  <button
                    type="button"
                    onClick={() => borrarChat(conversacion)}
                    aria-label={`Eliminar el chat con ${conversacion.nombre}`}
                    title="Eliminar chat"
                    className="self-stretch inline-flex items-center justify-center w-9 rounded-xl text-zinc-500 hover:bg-red-500/15 hover:text-red-400 active:scale-95 transition-all cursor-pointer shrink-0"
                  >
                    <IconoBasura className="w-5 h-5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
