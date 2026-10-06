//chat del visitante: muestra su conversacion con la admin y permite seguir mandando mensajes
//la identidad sale de la sesion de la cuenta (el backend la valida con el token de firebase)
//el token se pide fresco al abrir, porque el guardado en el navegador caduca a la hora
import { useEffect, useState } from 'react';
import { enviarMensaje, obtenerMensajesMios } from '../api/mensajes.js';
import { sesionConTokenFresco } from '../api/usuarios.js';
import Loading from './Loading.jsx';

export default function ChatVisitante({ sesion, nombreAdmin = 'Agustina Ferraro' }) {
  const { email, nombre } = sesion ?? {};
  const [token, setToken] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);

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
        if (activo) setMensajes(lista);
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

  //manda un mensaje nuevo y lo agrega al final de la conversacion (aparece al instante)
  async function manejarEnvio(e) {
    e.preventDefault();
    if (enviando || !texto.trim() || !token) return;

    setEnviando(true);
    setError('');
    try {
      const respuesta = await enviarMensaje({ mensaje: texto.trim() }, token);
      const nuevo = respuesta?.datos;
      if (nuevo) setMensajes((prev) => [...prev, nuevo]);
      setTexto('');
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
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
              <span className={`text-[11px] text-zinc-500 mt-1 ${esDeAgustina ? '' : 'text-right'}`}>
                {esDeAgustina ? m.nombre || nombreAdmin : nombre}
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
      </div>

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
    </div>
  );
}