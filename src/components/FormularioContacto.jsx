//zona de contacto
//si la persona está logueada se muestra el chat directo con agustina (sin rellenar un formulario)
//si la cuenta logueada es la dueña del sitio, en su lugar se muestra la bandeja de chats
//(la lista de personas que le escribieron, para elegir a quien entrar y responder)
//si no está logueada se le pide entrar o crearse una cuenta para poder escribir
import { useEffect, useState } from 'react';
import { obtenerPerfil } from '../api/perfil.js';
import { leerSesion, linkPerfil, soyDueno } from '../api/usuarios.js';
import ChatVisitante from './ChatVisitante.jsx';
import AdminMensajes from './AdminMensajes.jsx';
import Loading from './Loading.jsx';

export default function FormularioContacto() {
  //sesion de la cuenta en el navegador (nombre, email y token de firebase)
  const [sesion, setSesion] = useState(null);
  const [cargando, setCargando] = useState(true);
  //numero de whatsapp actual: sale del perfil (ocupado desde el panel) con uno por defecto
  const [telefonoWhatsapp, setTelefonoWhatsapp] = useState('5491131166948');
  //true si la cuenta logueada es la dueña (entonces se le muestra la bandeja de chats)
  const [esDueno, setEsDueno] = useState(false);
  //mientras se averigua si es la dueña no se muestra el chat de visitante (evita el parpadeo)
  const [verificandoDueno, setVerificandoDueno] = useState(false);

  //al abrir se trae la sesion y el perfil (para el numero de whatsapp configurado)
  useEffect(() => {
    const actualizarSesion = () => setSesion(leerSesion());
    actualizarSesion();
    setCargando(false);
    const cargar = () => {
      obtenerPerfil()
        .then((perfil) => {
          if (perfil.whatsapp) setTelefonoWhatsapp(perfil.whatsapp);
        })
        .catch(() => {});
    };
    cargar();
    //si el perfil se guardo desde el panel, se actualiza el numero
    window.addEventListener('perfil-actualizado', cargar);
    //si la persona entra o sale de su cuenta (misma pestaña u otra), el chat se actualiza
    window.addEventListener('sesion-usuario', actualizarSesion);
    window.addEventListener('storage', actualizarSesion);
    return () => {
      window.removeEventListener('perfil-actualizado', cargar);
      window.removeEventListener('sesion-usuario', actualizarSesion);
      window.removeEventListener('storage', actualizarSesion);
    };
  }, []);

  //averigua si la cuenta logueada es la dueña del sitio (para mostrarle la bandeja de chats)
  useEffect(() => {
    let activo = true;
    if (!sesion?.email) {
      setEsDueno(false);
      setVerificandoDueno(false);
      return undefined;
    }
    setVerificandoDueno(true);
    soyDueno()
      .then((es) => {
        if (activo) setEsDueno(es);
      })
      .catch(() => {
        if (activo) setEsDueno(false);
      })
      .finally(() => {
        if (activo) setVerificandoDueno(false);
      });
    return () => {
      activo = false;
    };
  }, [sesion?.email]);

  //encabezado de la seccion: cambia si la que mira es la dueña (ve su bandeja de mensajes)
  let titulo = 'Contacto';
  let descripcion = '¿Tenés un proyecto en mente? Escribime y te respondo a la brevedad.';
  let contenido;

  if (cargando || (sesion?.token && verificandoDueno)) {
    contenido = <Loading claseContenedor="h-32" />;
  } else if (sesion?.token && esDueno) {
    //estado: la dueña del sitio → bandeja de chats (como whatsapp) para elegir y responder
    titulo = 'Chats';
    descripcion = '';
    contenido = <AdminMensajes nombre={sesion.nombre} sinEncabezado />;
  } else if (sesion?.token) {
    //estado: persona logueada → chat directo con la admin (muestra su charla y puede seguir mandando)
    contenido = <ChatVisitante sesion={sesion} />;
  } else {
    //estado: sin cuenta → se pide registrarse/entrar para poder escribir
    contenido = (
      <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-left space-y-4">
        <p className="text-zinc-300 font-medium">
          Para escribirme necesitás una cuenta.
        </p>
        <p className="text-sm text-zinc-400 leading-relaxed">
          Creá tu cuenta o entrá y vas a poder hablar directo conmigo:
          tu mensaje y la respuesta quedan en un chat. Al entrar volvés acá sola.
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href={linkPerfil('registro')}
            className="inline-block px-6 py-3 rounded-full bg-violeta-app hover:bg-violeta-app/90 active:bg-violeta-app/80 text-black font-medium transition-all duration-200 hover:scale-105 active:scale-95"
          >
            Crear cuenta o entrar
          </a>
          {/*si todavia no tiene cuenta, whatsapp queda como via directa*/}
          <a
            href={`https://wa.me/${telefonoWhatsapp}?text=${encodeURIComponent('¡Hola! Te escribo desde tu portfolio.')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-6 py-3 rounded-full bg-whatsapp hover:bg-whatsapp-claro text-black font-medium transition-all duration-200 hover:scale-105 active:scale-95"
          >
            ¡Hablar por WhatsApp!
          </a>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 text-left">
        <h2 className="text-4xl font-bold text-white inline-flex items-center gap-3">
          <svg
            aria-hidden="true"
            className="w-9 h-9 text-verde-app"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" d="m22 6-10 7L2 6" />
          </svg>
          {titulo}
        </h2>
        {descripcion && <p className="text-zinc-400 leading-relaxed">{descripcion}</p>}
      </div>
      {contenido}
    </>
  );
}
