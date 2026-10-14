//chat del visitante: muestra su conversacion con la admin y permite seguir mandando mensajes
//la identidad sale de la sesion de la cuenta (el backend la valida con el token de firebase)
//el token se pide fresco al abrir, porque el guardado en el navegador caduca a la hora
//el chat se sincroniza con whatsapp: cada mensaje que manda el visitante se guarda en el
//portfolio y ademas se abre whatsapp con el texto listo, para que le llegue al celular de la admin
import { useEffect, useState } from 'react';
import { enviarMensaje, guardarTelefono, obtenerMensajesMios } from '../api/mensajes.js';
import { sesionConTokenFresco } from '../api/usuarios.js';
import Loading from './Loading.jsx';

function IconoWhatsapp({ className = 'w-3.5 h-3.5' }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.01-1.04 2.47s1.06 2.86 1.21 3.06c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.28.17-1.41-.07-.13-.27-.2-.57-.35z"></path>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.87 9.87 0 0 0 4.79 1.22h.01c5.46 0 9.9-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.17 8.17 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.25-8.23 2.2 0 4.27.86 5.83 2.42a8.19 8.19 0 0 1 2.41 5.82c0 4.54-3.7 8.23-8.24 8.23"></path>
    </svg>
  );
}

export default function ChatVisitante({ sesion, nombreAdmin = 'Agustina Ferraro', whatsapp = '5491131166948' }) {
  const { email, nombre } = sesion ?? {};
  const [token, setToken] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  //whatsapp de la persona: si lo deja, la admin puede responderle por whatsapp desde el panel
  //se carga con un boton que abre un modal (el input fijo hacia zoom en mobile al tocarlo)
  //telefonoGuardado = lo que quedo persistido; telefono = lo que se esta tipeando en el modal
  const [telefonoGuardado, setTelefonoGuardado] = useState(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('chat-whatsapp') ?? '';
  });
  const [telefono, setTelefono] = useState(telefonoGuardado);
  const [ventanaTel, setVentanaTel] = useState(false);
  const [errorTel, setErrorTel] = useState('');
  const [guardandoTel, setGuardandoTel] = useState(false);
  const sincronizado = Boolean(telefonoGuardado);

  //el modal de whatsapp se cierra con Escape
  useEffect(() => {
    if (!ventanaTel) return undefined;
    const alPresionar = (e) => {
      if (e.key === 'Escape') setVentanaTel(false);
    };
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, [ventanaTel]);

  //pide un token vigente: el del navegador puede estar vencido y la api responderia 401
  useEffect(() => {
    let activo = true;
    sesionConTokenFresco().then((nueva) => {
      if (activo) setToken(nueva?.token ?? '');
    });
    return () => {
      activo = false;
    };
  }, []);

  //con el token en mano trae la conversacion completa (lo que mando y lo que le respondieron)
  useEffect(() => {
    if (!token) return undefined;
    let activo = true;
    obtenerMensajesMios(token)
      .then((lista) => {
        if (!activo) return;
        setMensajes(lista);
        //si el numero ya quedo guardado en la conversacion se recupera de ahi
        const guardado = lista.find((m) => m.telefono)?.telefono ?? '';
        if (guardado) {
          setTelefono((actual) => actual || guardado);
          setTelefonoGuardado((actual) => actual || guardado);
        }
      })
      .catch((err) => {
        if (activo) setError(err.message);
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, [token]);

  //manda un mensaje nuevo: se guarda en el chat del portfolio y, en el mismo gesto del
  //click, se abre whatsapp con el texto listo para que le llegue al celular de la admin
  //(si se abriera despues del await lo bloquearia el navegador)
  async function manejarEnvio(e) {
    e.preventDefault();
    if (enviando || !texto.trim() || !token) return;

    const textoLimpio = texto.trim();
    setEnviando(true);
    setError('');
    setTexto('');
    const link = `https://wa.me/${whatsapp}?text=${encodeURIComponent(
      `¡Hola! Te escribo desde tu portfolio:\n\n${textoLimpio}`
    )}`;
    window.open(link, '_blank', 'noopener,noreferrer');
    try {
      const respuesta = await enviarMensaje(
        { mensaje: textoLimpio, telefono: telefonoGuardado },
        token
      );
      const nuevo = respuesta?.datos;
      if (nuevo) setMensajes((prev) => [...prev, nuevo]);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  //guarda el whatsapp de la persona en su conversacion (para que la admin le responda por ahi)
  //y cierra el modal mostrando el estado sincronizado
  async function guardarTel() {
    const numero = telefono.trim();
    if (!numero || guardandoTel) return;
    setGuardandoTel(true);
    setErrorTel('');
    try {
      if (mensajes.length > 0 && token) await guardarTelefono(numero, token);
      localStorage.setItem('chat-whatsapp', numero);
      setTelefonoGuardado(numero);
      setVentanaTel(false);
    } catch (err) {
      setErrorTel(err.message);
    } finally {
      setGuardandoTel(false);
    }
  }

  function abrirModalTel() {
    setErrorTel('');
    setVentanaTel(true);
  }

  let contenido;
  if (cargando || !token) {
    contenido = <Loading claseContenedor="h-48" />;
  } else if (error && mensajes.length === 0) {
    contenido = (
      <div className="py-12 text-center space-y-3">
        <p className="text-zinc-400 text-sm">No se pudo cargar la conversación.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="text-violeta-app text-sm rounded-lg px-2 py-1 hover:bg-violeta-app/10 hover:text-violeta-app/80 active:scale-95 hover:scale-105 transition-all duration-200 cursor-pointer"
        >
          Reintentar
        </button>
      </div>
    );
  } else if (mensajes.length === 0) {
    contenido = (
      <div className="py-12 text-center">
        <p className="text-zinc-400 text-sm">
          Todavía no hay mensajes. Contame sobre tu proyecto, te leo.
        </p>
      </div>
    );
  } else {
    contenido = (
      <ul className="space-y-3 overflow-y-auto max-h-72 pr-1" aria-label={`Conversación con ${nombreAdmin}`}>
        {mensajes.map((m) => {
          //como en cualquier chat: lo que escribe el visitante a la derecha (verde de la marca)
          //y lo que responde la dueña del sitio a la izquierda (gris del sitio)
          const esDeAgustina = m.esRespuesta === true;
          return (
            <li key={m._id} className={`flex flex-col ${esDeAgustina ? 'items-start' : 'items-end'}`}>
              <div
                className={`max-w-[85%] px-4 py-2 rounded-2xl text-sm ${
                  esDeAgustina
                    ? 'rounded-tl-sm bg-zinc-800 border border-zinc-700 text-zinc-200'
                    : 'rounded-tr-sm bg-verde-app text-black'
                }`}
              >
                <p className="m-0 whitespace-pre-wrap break-words">{m.mensaje}</p>
              </div>
              <span className={`text-[11px] text-zinc-500 mt-1 inline-flex items-center gap-1 ${esDeAgustina ? '' : 'text-right'}`}>
                {esDeAgustina ? m.nombre || nombreAdmin : nombre}
                {/*etiqueta verde: solo cuando de verdad el mensaje paso por whatsapp*/}
                {esDeAgustina && m.porWhatsapp && (
                  <span className="inline-flex items-center gap-1 text-whatsapp">
                    <IconoWhatsapp className="w-3 h-3" />
                    Respondido por WhatsApp
                  </span>
                )}
                {!esDeAgustina && (
                  <span className="inline-flex items-center gap-1 text-whatsapp">
                    <IconoWhatsapp className="w-3 h-3" />
                    Enviado por WhatsApp
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className="p-6 rounded-2xl bg-black/60 border border-zinc-800 space-y-4">
      {/*header tipo redes: el nombre de agustina arriba con un indicador de en linea*/}
      <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
        <span className="flex items-center justify-center w-10 h-10 rounded-full bg-violeta-app/20 border border-violeta-app/30 text-violeta-app font-bold text-lg">
          {nombreAdmin.charAt(0).toUpperCase()}
        </span>
        <div className="leading-tight">
          <p className="font-bold text-zinc-100">
            {nombre ? `Chatea con ${nombreAdmin.split(' ')[0]}` : nombreAdmin}
          </p>
          <p className="text-xs text-emerald-400 flex items-center gap-1">
            <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            En línea
          </p>
        </div>
        {/*pill verde: avisa que el chat esta sincronizado con whatsapp*/}
        <span className="ml-auto inline-flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-full bg-whatsapp/15 text-whatsapp border border-whatsapp/25 text-[11px] font-medium">
          <IconoWhatsapp />
          Sincronizado con WhatsApp
        </span>
      </div>

      {/*aclaracion de como funciona el sincronismo*/}
      <p className="text-xs text-zinc-400 leading-relaxed -mt-1">
        Este chat se sincroniza con WhatsApp: cada mensaje que mandás se guarda acá y además se
        abre WhatsApp con tu texto, para que me llegue a mi celular.
      </p>

      {contenido}

      {error && mensajes.length > 0 && (
        <p role="alert" className="text-red-400 text-sm">
          {error}
        </p>
      )}

      <form onSubmit={manejarEnvio} className="flex items-end gap-2">
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Escribí tu mensaje..."
          aria-label="Escribí tu mensaje"
          className="flex-1 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-600 focus:outline-none focus:border-violeta-app"
        />
        <button
          type="submit"
          disabled={enviando || !texto.trim()}
          className="px-4 py-2 rounded-xl bg-violeta-app hover:bg-violeta-app/90 text-black text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 active:scale-95"
        >
          {enviando ? 'Enviando...' : 'Enviar'}
        </button>
      </form>

      {/*whatsapp de la persona: opcional, para que la admin le pueda responder por ahi*/}
      <div className="border-t border-zinc-800 pt-4 space-y-2">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {sincronizado ? (
            <span className="inline-flex items-center gap-2 text-sm text-whatsapp font-medium">
              <IconoWhatsapp className="w-4 h-4" />
              Sincronizado con WhatsApp
            </span>
          ) : (
            <button
              type="button"
              onClick={abrirModalTel}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-whatsapp/15 border border-whatsapp/40 text-whatsapp text-sm font-medium hover:bg-whatsapp/25 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
            >
              <IconoWhatsapp className="w-4 h-4" />
              Sincronizar con WhatsApp
            </button>
          )}
          {sincronizado && (
            <button
              type="button"
              onClick={abrirModalTel}
              className="text-xs text-zinc-400 underline underline-offset-2 hover:text-white transition-colors cursor-pointer"
            >
              Cambiar número
            </button>
          )}
        </div>
        <p className="text-xs text-zinc-500">
          {sincronizado
            ? `Así Agustina te puede responder a ${telefonoGuardado}.`
            : 'Dejá tu número y las respuestas de Agustina te pueden llegar a tu WhatsApp.'}
        </p>
      </div>

      {/*modal para dejar el numero: al tocar el input de mobile no se achica la pantalla
      (el texto va en 16px, menos hace zoom el navegador del telefono)*/}
      {ventanaTel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 animacion-aparecer"
          onClick={(e) => {
            if (e.target === e.currentTarget) setVentanaTel(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Sincronizar con WhatsApp"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-700 p-6 shadow-2xl space-y-4"
          >
            <span className="flex items-center justify-center w-12 h-12 rounded-full bg-whatsapp/15 border border-whatsapp/30 text-whatsapp">
              <IconoWhatsapp className="w-6 h-6" />
            </span>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">Sincronizar con WhatsApp</h3>
              <p className="text-sm text-zinc-400">
                Dejá tu número con código de país y las respuestas de Agustina te pueden llegar a
                tu WhatsApp.
              </p>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="chat-telefono" className="block text-xs text-zinc-400">
                Tu número (código de país)
              </label>
              <input
                id="chat-telefono"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                autoFocus
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Ej: 5491122334455"
                className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-base placeholder:text-zinc-500 focus:outline-none focus:border-whatsapp transition-colors"
              />
            </div>
            {errorTel && (
              <p role="alert" className="text-red-400 text-sm">
                {errorTel}
              </p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setVentanaTel(false)}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-sm transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={guardarTel}
                disabled={guardandoTel || !telefono.trim()}
                className="flex-1 px-4 py-2.5 rounded-xl bg-whatsapp hover:bg-whatsapp-claro text-black text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
              >
                {guardandoTel ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}