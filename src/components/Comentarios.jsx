//seccion de comentarios de un proyecto: leer es publico, comentar pide estar registrado
//el registro y el login se hacen en /perfil; aca solo se le ofrece al visitante entrar
import { useEffect, useState } from 'react';
import { obtenerComentarios, publicarComentario } from '../api/comentarios.js';
import { leerSesion, borrarSesion, sesionConTokenFresco, linkPerfil } from '../api/usuarios.js';
import Loading from './Loading.jsx';

//colores del circulo del avatar segun la primera letra del nombre
const coloresAvatar = [
  'bg-violeta-app/20 text-violeta-app border-violeta-app/30',
  'bg-verde-app/15 text-verde-app border-verde-app/30',
  'bg-sky-500/15 text-sky-300 border-sky-500/30',
  'bg-amber-400/15 text-amber-300 border-amber-400/30',
];

function inicialAvatar(nombre) {
  return (nombre ?? '?').trim().charAt(0).toUpperCase() || '?';
}

function colorAvatar(nombre) {
  const letra = inicialAvatar(nombre).charCodeAt(0);
  return coloresAvatar[letra % coloresAvatar.length];
}

//si el nombre parece un correo, se muestra la parte de antes de la arroba:
//un comentario nunca muestra el email completo del autor
function nombreVisible(nombre) {
  const limpio = String(nombre ?? '').trim();
  if (!limpio) return 'Visitante';
  return limpio.includes('@') ? limpio.split('@')[0] : limpio;
}

function formatearFecha(fecha) {
  try {
    return new Date(fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

const claseInput =
  'w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-verde-app transition-all';

export default function Comentarios({ proyectoId }) {
  const [comentarios, setComentarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [sesion, setSesion] = useState(null);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  //si la foto de la sesion no carga, se cae a la inicial
  const [fotoFalla, setFotoFalla] = useState(false);

  //al abrir se cargan los comentarios del proyecto y la sesion guardada
  useEffect(() => {
    let activo = true;
    obtenerComentarios(proyectoId)
      .then((lista) => {
        if (activo) setComentarios(lista);
      })
      .catch(() => {
        if (activo) setError('No se pudieron cargar los comentarios.');
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    //la sesion se pide con token fresco: el guardado en el navegador puede estar vencido
    sesionConTokenFresco().then((nueva) => {
      if (activo) setSesion(nueva);
    });
    return () => {
      activo = false;
    };
  }, [proyectoId]);

  //al cambiar la foto (o la cuenta) se reintenta cargarla
  useEffect(() => {
    setFotoFalla(false);
  }, [sesion?.foto]);

  //publica el comentario escrito
  async function manejarComentar(e) {
    e.preventDefault();
    if (enviando || !texto.trim() || !sesion?.token) return;

    setEnviando(true);
    setError('');
    try {
      const respuesta = await publicarComentario(proyectoId, texto.trim(), sesion.token);
      const nuevo = respuesta?.datos;
      if (nuevo) setComentarios((prev) => [...prev, nuevo]);
      setTexto('');
    } catch (err) {
      if (/401/.test(err.message)) {
        borrarSesion();
        setSesion(null);
      }
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  function cerrarSesion() {
    borrarSesion();
    setSesion(null);
    setTexto('');
  }

  let contenido;
  if (cargando) {
    contenido = <Loading claseContenedor="h-32" />;
  } else if (comentarios.length === 0) {
    contenido = <p className="text-zinc-500 text-sm">Todavía no hay comentarios.</p>;
  } else {
    contenido = (
      <ul className="space-y-4">
        {comentarios.map((comentario) => (
          <li key={comentario._id} className="flex gap-3">
            <span
              aria-hidden="true"
              className={`shrink-0 flex items-center justify-center w-10 h-10 rounded-full border font-bold text-base ${colorAvatar(comentario.nombre)}`}
            >
              {inicialAvatar(comentario.nombre)}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-zinc-100 text-sm">{nombreVisible(comentario.nombre)}</span>
                <span className="text-xs text-zinc-500">{formatearFecha(comentario.createdAt)}</span>
              </div>
              <p className="text-zinc-300 text-sm whitespace-pre-wrap break-words mt-1">{comentario.texto}</p>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <section className="mt-12 space-y-6" aria-label="Comentarios del proyecto">
      <h2 className="flex items-center gap-3 text-2xl font-bold text-white">
        <svg aria-hidden="true" className="w-7 h-7 text-violeta-app" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
        Comentarios
        {!cargando && comentarios.length > 0 && (
          <span className="text-sm px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
            {comentarios.length}
          </span>
        )}
      </h2>

      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 space-y-4">
        {contenido}

        {error && <p role="alert" className="text-red-400 text-sm">{error}</p>}

        {sesion?.token ? (
          /*logueado: caja para escribir el comentario*/
          <form onSubmit={manejarComentar} className="pt-4 border-t border-zinc-800 space-y-3">
            <p className="text-sm text-zinc-400 flex items-center gap-2 flex-wrap">
              {sesion.foto && !fotoFalla ? (
                <img
                  src={sesion.foto}
                  alt=""
                  className="w-6 h-6 rounded-full object-cover border border-zinc-700"
                  onError={() => setFotoFalla(true)}
                />
              ) : (
                <span className={`shrink-0 flex items-center justify-center w-6 h-6 rounded-full border font-bold text-xs ${colorAvatar(sesion.nombre)}`}>
                  {inicialAvatar(sesion.nombre)}
                </span>
              )}
              <span>
                Comentás como <span className="font-bold text-white">{nombreVisible(sesion.nombre)}</span>
              </span>
              <a
                href={linkPerfil()}
                className="text-xs text-zinc-500 rounded-lg px-2 py-1 hover:bg-zinc-800 hover:text-zinc-300 active:scale-95 hover:scale-105 transition-all duration-200"
              >
                Tu perfil
              </a>
              <button
                type="button"
                onClick={cerrarSesion}
                className="text-xs text-zinc-500 rounded-lg px-2 py-1 hover:bg-zinc-800 hover:text-zinc-300 active:scale-95 hover:scale-105 transition-all duration-200 cursor-pointer"
              >
                Cerrar sesión
              </button>
            </p>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Dejá un comentario..."
              aria-label="Dejá un comentario"
              rows={3}
              className={`${claseInput} resize-none`}
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={enviando || !texto.trim()}
                className="px-5 py-2 rounded-full bg-violeta-app hover:bg-violeta-app/90 text-black text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 active:scale-95"
              >
                {enviando ? 'Publicando...' : 'Comentar'}
              </button>
            </div>
          </form>
        ) : (
          /*sin sesion: entrada discreta al registro/login (se hace en /perfil,
            que despues devuelve al usuario a esta misma pagina)*/
          <div className="pt-4 border-t border-zinc-800 space-y-3">
            <p className="text-sm text-zinc-400">
              {comentarios.length === 0
                ? '¿Querés dejar tu opinión? Creá tu cuenta y comentá.'
                : '¿Querés sumarte? Creá tu cuenta y comentá.'}
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href={linkPerfil()}
                className="inline-block px-5 py-2 rounded-full bg-zinc-800 hover:bg-zinc-700 hover:text-white active:bg-zinc-600 text-zinc-200 border border-zinc-700 text-sm transition-all duration-200 hover:scale-105 active:scale-95"
              >
                Iniciar sesión
              </a>
              <a
                href={linkPerfil('registro')}
                className="inline-block px-5 py-2 rounded-full bg-violeta-app hover:bg-violeta-app/90 active:bg-violeta-app/80 text-black text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95"
              >
                Crear cuenta
              </a>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}