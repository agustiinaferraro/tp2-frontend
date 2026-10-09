//avatar del navbar: muestra la foto de la cuenta que esta conectada (o la inicial del nombre
//si todavia no hay foto elegida) y es el acceso al perfil
import { useEffect, useState } from 'react';
import { leerSesion, sesionConTokenFresco, soyDueno } from '../api/usuarios.js';

function inicial(nombre) {
  return (nombre ?? '?').trim().charAt(0).toUpperCase() || '?';
}

export default function AvatarAdmin({ seccionActiva = '' }) {
  //la sesion se lee recien en el navegador: en el servidor no hay localstorage
  //(si se leyera antes, el html que genera el build no coincidiria con la pagina y react se queja)
  const [sesion, setSesion] = useState(null);
  const [listo, setListo] = useState(false);
  //si la foto no carga (por ejemplo una url vencida), se cae a la inicial del nombre
  const [fotoFalla, setFotoFalla] = useState(false);
  //si la cuenta conectada es la dueña del sitio, se marca en el nav
  const [esDueno, setEsDueno] = useState(false);

  useEffect(() => {
    const actualizar = () => {
      setSesion(leerSesion());
      setListo(true);
    };
    actualizar();
    //se revalida con un token fresco: si el guardado estaba vencido, se actualiza la foto y el nombre
    sesionConTokenFresco().then((nueva) => {
      if (nueva) setSesion(nueva);
    });
    window.addEventListener('sesion-usuario', actualizar);
    window.addEventListener('storage', actualizar);
    return () => {
      window.removeEventListener('sesion-usuario', actualizar);
      window.removeEventListener('storage', actualizar);
    };
  }, []);

  //cuando cambia la foto (o la cuenta) se vuelve a intentar cargarla
  useEffect(() => {
    setFotoFalla(false);
  }, [sesion?.foto]);

  //pregunta al backend si la cuenta conectada es la dueña, para marcarla en el nav
  useEffect(() => {
    if (!sesion?.email) {
      setEsDueno(false);
      return;
    }
    let activo = true;
    soyDueno()
      .then((es) => {
        if (activo) setEsDueno(es);
      })
      .catch(() => {});
    return () => {
      activo = false;
    };
  }, [sesion?.email]);

  const nombre = sesion?.nombre ?? '';
  //sin sesion el perfil se ve igual, como "Anonimo"
  const nombreMostrado = sesion ? nombre : 'Anónimo';
  //la dueña va directo a su panel de proyectos; el resto, a la pagina de perfil
  const destino = esDueno ? '/admin' : '/perfil';
  const nombreAccesible = esDueno
    ? `Panel de administración (${nombre})`
    : sesion
      ? `Mi perfil (${nombre})`
      : 'Mi perfil (Anónimo)';
  //mientras se esta en el perfil (o el panel) queda resaltado, para saber donde estamos parados
  const enPerfil = seccionActiva === 'perfil';

  //hasta que no se lee la sesion se dibuja el circulo vacio, igual en el build y en el navegador
  const contenido = sesion?.foto && !fotoFalla ? (
    <img
      src={sesion.foto}
      alt=""
      className="w-full h-full object-cover"
      onError={() => setFotoFalla(true)}
    />
  ) : (
    <span
      aria-hidden="true"
      className={`text-zinc-300 font-bold text-sm transition-colors ${
        enPerfil
          ? 'text-verde-app'
          : 'group-hover:text-verde-app group-active:text-verde-app group-focus-visible:text-verde-app'
      }`}
    >
      {listo ? (sesion ? inicial(nombre) : 'A') : ''}
    </span>
  );

  //el circulo se resalta (borde/ring verde) al pasar el mouse o tocar el perfil, y queda
  //resaltado mientras se esta en la pagina del perfil
  const circulo = (
    <span
      className={`w-full h-full rounded-full overflow-hidden shrink-0 inline-flex items-center justify-center bg-zinc-800 border transition-colors ${
        enPerfil
          ? 'border-verde-app'
          : 'border-zinc-700 group-hover:border-verde-app group-active:border-verde-app group-focus-visible:border-verde-app'
      }`}
    >
      {contenido}
    </span>
  );

  return (
    <a
      href={destino}
      aria-label={nombreAccesible}
      title={esDueno ? 'Panel de administración' : 'Mi perfil'}
      className="group flex flex-col items-center gap-1 rounded-lg px-2 py-1 hover:bg-zinc-800 hover:scale-105 active:scale-95 active:bg-zinc-700 transition-all duration-200"
    >
      <span
        className={`relative w-9 h-9 rounded-full transition-shadow group-hover:ring-2 group-hover:ring-verde-app group-active:ring-2 group-active:ring-verde-app group-focus-visible:ring-2 group-focus-visible:ring-verde-app ${
          enPerfil ? 'ring-2 ring-verde-app' : ''
        }`}
      >
        {circulo}
        {/*insignia de dueña: escudito verde sobre el avatar*/}
        {esDueno && (
          <span
            title="Dueña del sitio"
            className="absolute -bottom-0.5 -right-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-verde-app text-black border-2 border-black"
          >
            <svg aria-hidden="true" className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
            </svg>
          </span>
        )}
      </span>
      {/*el nombre de usuario va abajo del circulo: se ve quien esta conectado sin abrir nada*/}
      <span
        className={`max-w-20 truncate text-[11px] leading-none transition-colors ${
          enPerfil
            ? 'text-verde-app font-bold'
            : 'text-zinc-400 group-hover:text-verde-app group-hover:font-bold group-active:text-verde-app group-active:font-bold group-focus-visible:text-verde-app group-focus-visible:font-bold'
        }`}
      >
        {nombreMostrado}
      </span>
    </a>
  );
}