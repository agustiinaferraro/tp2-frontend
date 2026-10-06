//avatar del navbar: muestra la foto de la cuenta que esta conectada (o la inicial del nombre
//si todavia no hay foto elegida) y es el acceso al perfil
import { useEffect, useState } from 'react';
import { leerSesion, sesionConTokenFresco } from '../api/usuarios.js';

function inicial(nombre) {
  return (nombre ?? '?').trim().charAt(0).toUpperCase() || '?';
}

export default function AvatarAdmin() {
  //la sesion se lee recien en el navegador: en el servidor no hay localstorage
  //(si se leyera antes, el html que genera el build no coincidiria con la pagina y react se queja)
  const [sesion, setSesion] = useState(null);
  const [listo, setListo] = useState(false);

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

  const nombre = sesion?.nombre ?? '';
  //sin sesion el perfil se ve igual, como "Anonimo"
  const nombreMostrado = sesion ? nombre : 'Anónimo';
  const nombreAccesible = sesion ? `Mi perfil (${nombre})` : 'Mi perfil (Anónimo)';

  //hasta que no se lee la sesion se dibuja el circulo vacio, igual en el build y en el navegador
  const contenido = sesion?.foto ? (
    <img src={sesion.foto} alt="" className="w-full h-full object-cover" />
  ) : (
    <span aria-hidden="true" className="text-verde-app font-bold text-sm">
      {listo ? (sesion ? inicial(nombre) : 'A') : ''}
    </span>
  );

  //w-full h-full para que el circulo ocupe el cuadrado del wrapper y la foto no se encoja
  const circulo = (
    <span className="w-full h-full rounded-full overflow-hidden shrink-0 inline-flex items-center justify-center bg-zinc-800 border border-zinc-700">
      {contenido}
    </span>
  );

  return (
    <a
      href="/perfil"
      aria-label={nombreAccesible}
      title="Mi perfil"
      className="flex flex-col items-center gap-1 rounded-lg px-2 py-1 hover:bg-zinc-800 hover:scale-105 active:scale-95 active:bg-zinc-700 transition-all duration-200"
    >
      <span className="w-9 h-9 hover:border-verde-app hover:text-white transition-colors">
        {circulo}
      </span>
      {/*el nombre de usuario va abajo del circulo: se ve quien esta conectado sin abrir nada*/}
      <span className="max-w-20 truncate text-[11px] leading-none text-zinc-400 hover:text-white transition-colors">
        {nombreMostrado}
      </span>
    </a>
  );
}