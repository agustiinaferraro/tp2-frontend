//pagina "perfil": nombre de usuario, foto y gestion de la cuenta
//las cuentas se crean en firebase authentication y la sesion se guarda en el navegador
//la misma sesion se usa para comentar en los proyectos
//si no hay sesion el perfil se ve igual, como "Anónimo", con la opcion de entrar o crear cuenta
//si la cuenta es de la dueña, tambien se le ofrece entrar al panel de administracion
import { useEffect, useRef, useState } from 'react';
import {
  registrarUsuario,
  iniciarSesion,
  entrarConGoogle as entrarConGoogleCuenta,
  leerSesion,
  guardarSesion,
  borrarSesion,
  actualizarFoto,
  actualizarNombre,
  listarCuentas,
  guardarCuenta,
  olvidarCuenta,
  cuentaConfigurada,
  obtenerEmailDueno,
  eliminarCuenta,
  cerrarSesionFirebase,
} from '../api/usuarios.js';
import { comprimirImagen } from '../utils/imagen.js';

const claseInput =
  'w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-verde-app transition-all';

function IconoGoogle() {
  return (
    <svg className="w-5 h-5" aria-hidden="true" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

//lapiz para editar los datos del perfil
function IconoLapiz({ className }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
    >
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  );
}

//muestra la foto del perfil y, si no hay o no carga, la inicial del nombre
function AvatarPerfil({ foto, nombre, className, classNameInicial }) {
  //si la imagen falla (por ejemplo una url vencida) se cae a la inicial
  const [falla, setFalla] = useState(false);
  useEffect(() => {
    setFalla(false);
  }, [foto]);

  if (foto && !falla) {
    return <img src={foto} alt="" className={className} onError={() => setFalla(true)} />;
  }
  return (
    <span aria-hidden="true" className={classNameInicial}>
      {(nombre ?? '?').charAt(0).toUpperCase() || '?'}
    </span>
  );
}

//solo se vuelve a rutas del propio sitio (ej: /proyectos), nunca a direcciones externas
function esRutaInterna(ruta) {
  return typeof ruta === 'string' && ruta.startsWith('/') && !ruta.startsWith('//');
}

export default function CuentaUsuario() {
  //la sesion se lee recien en el navegador (no existe en el servidor):
  //hasta que no este "montado" se dibuja el estado neutro para que el html del build y el del
  //navegador sean iguales (si no, react avisa del error de hidratacion en la consola)
  const [montado, setMontado] = useState(false);
  const [sesion, setSesion] = useState(null);
  //"login" | "registro" (al llegar con ?modo=registro se abre la creacion de cuenta)
  const [modo, setModo] = useState(() => {
    if (typeof window === 'undefined') return 'login';
    return new URLSearchParams(window.location.search).get('modo') === 'registro' ? 'registro' : 'login';
  });
  //pagina de la que se vino: al entrar o registrarse se vuelve ahi (viene en ?volver=)
  //se aceptan solo rutas internas: si el link trae una direccion externa se ignora
  const [volver] = useState(() => {
    if (typeof window === 'undefined') return '';
    const pedido = new URLSearchParams(window.location.search).get('volver') ?? '';
    return esRutaInterna(pedido) ? pedido : '';
  });
  const [form, setForm] = useState({ nombre: '', email: '', clave: '' });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  //email de la dueña del sitio, para ofrecerle el panel de administracion
  const [emailDueno, setEmailDueno] = useState('');
  //input oculto para elegir la foto de perfil
  const fotoInputRef = useRef(null);
  //edicion del perfil: nombre y foto se editan y se confirman con un solo boton
  const [nombreEditado, setNombreEditado] = useState('');
  const [fotoNueva, setFotoNueva] = useState(null);
  const [guardando, setGuardando] = useState(false);
  //dialogo de cuentas: "" (cerrado) | "cambiar" | "agregar"
  const [ventana, setVentana] = useState('');
//confirmacion de eliminar la cuenta: primero se avisa, despues se borra
const [confirmandoBorrado, setConfirmandoBorrado] = useState(false);
const [borrando, setBorrando] = useState(false);
//avisos de confirmacion: "cambios guardados" o "cuenta eliminada"
const [guardado, setGuardado] = useState(false);
const [aviso, setAviso] = useState('');
//cuentas guardadas en el navegador (varias cuentas como en ig)
const [cuentas, setCuentas] = useState(() => listarCuentas());

  //solo deja ver el panel si la cuenta logueada es de la dueña
  const esDueno = !!sesion && sesion.email?.toLowerCase() === emailDueno.toLowerCase();

  //hay cambios sin guardar en el perfil: habilita el boton general de guardado
  const hayCambios =
    Boolean(fotoNueva) || nombreEditado.trim() !== (sesion?.nombre ?? '').trim();

  useEffect(() => {
    const guardada = leerSesion();
    setSesion(guardada);
    setNombreEditado(guardada?.nombre ?? '');
    setMontado(true);
    obtenerEmailDueno()
      .then((email) => setEmailDueno(email ?? ''))
      .catch(() => {});
  }, []);

  //guarda la sesion devuelta por firebase, la suma a las cuentas guardadas y actualiza la pantalla
  //si viene del dialogo "agregar cuenta", al final lo cierra
  //si se entro desde otra pagina para comentar o escribir, se vuelve a esa pagina
  function aplicarSesion(respuesta, desdeVentana = false) {
    const nuevaSesion = {
      token: respuesta.token,
      nombre: respuesta.usuario.nombre,
      email: respuesta.usuario.email,
      foto: respuesta.usuario.foto ?? '',
    };
    guardarCuenta(nuevaSesion);
    setCuentas(listarCuentas());
    guardarSesion(nuevaSesion);
    setSesion(nuevaSesion);
    setForm({ nombre: '', email: '', clave: '' });
    limpiarEdicion(nuevaSesion.nombre);
    if (desdeVentana) setVentana('');
    //vuelve al punto de partida (la pagina donde estaba antes de registrarse)
    if (volver) window.location.assign(volver);
  }

  //deja los campos de edicion como los datos guardados
  function limpiarEdicion(nombre) {
    setNombreEditado(nombre ?? '');
    setFotoNueva(null);
    setError('');
  }

  //elige una foto de perfil: se comprime y queda lista para guardar con el boton general
  async function cambiarFoto(e) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setError('');
    try {
      setFotoNueva(await comprimirImagen(archivo));
    } catch (err) {
      setError(err.message);
    }
  }

  //guarda los cambios del perfil (nombre y foto) con el boton general
  async function guardarCambios() {
    if (guardando || !hayCambios) return;
    const nombreLimpio = nombreEditado.trim();
    if (!nombreLimpio) {
      setError('El nombre no puede estar vacío.');
      return;
    }

    setGuardando(true);
    setError('');
    try {
      let sesionActual = sesion;
      //el nombre vive en firebase (para que lo vean los demas al comentar)
      if (nombreLimpio !== sesion?.nombre) {
        sesionActual = await actualizarNombre(nombreLimpio);
      }
      //la foto se guarda solo en el navegador de esta persona
      if (fotoNueva) {
        sesionActual = actualizarFoto(fotoNueva);
      }
      if (sesionActual) {
        guardarCuenta(sesionActual);
        setCuentas(listarCuentas());
        setSesion(sesionActual);
      }
      limpiarEdicion(sesionActual?.nombre ?? nombreLimpio);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  //el aviso de "cambios guardados" se borra solo a los pocos segundos
  useEffect(() => {
    if (!guardado) return undefined;
    const t = setTimeout(() => setGuardado(false), 3000);
    return () => clearTimeout(t);
  }, [guardado]);

  //eliminar la cuenta: borra en el backend la conversacion y los comentarios, y cierra la sesion
  async function confirmarBorrado() {
    if (borrando) return;
    setBorrando(true);
    setError('');
    try {
      await eliminarCuenta();
      //la cuenta ya no existe: se vuelve a la pantalla de acceso
      setSesion(null);
      setCuentas(listarCuentas());
      setModo('login');
      setVentana('');
      setConfirmandoBorrado(false);
      setGuardado(false);
      setAviso('Tu cuenta se eliminó. Se borraron tus conversaciones, comentarios e interacciones.');
    } catch (err) {
      setError(err.message);
      setConfirmandoBorrado(false);
    } finally {
      setBorrando(false);
    }
  }

  //entra con una cuenta de google (firebase abre el selector de cuentas)
  //desdeVentana: true cuando se agrega otra cuenta desde el dialogo
  async function entrarConGoogle(desdeVentana = false) {
    if (enviando) return;
    setEnviando(true);
    setError('');
    try {
      aplicarSesion(await entrarConGoogleCuenta(), desdeVentana);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  function cambiarCampo(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  //registro o login: guarda la sesion y muestra los datos del usuario
  async function manejarEnvio(e, desdeVentana = false) {
    e.preventDefault();
    if (enviando) return;
    setEnviando(true);
    setError('');
    try {
      const respuesta = modo === 'registro' ? await registrarUsuario(form) : await iniciarSesion(form);
      aplicarSesion(respuesta, desdeVentana);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  //cambia la sesion activa a otra cuenta guardada (como cambiar de cuenta en ig)
  function cambiarCuentaActiva(cuenta) {
    guardarSesion(cuenta);
    setSesion(cuenta);
    limpiarEdicion(cuenta.nombre);
    setGuardado(false);
    setConfirmandoBorrado(false);
    setVentana('');
  }

  //cerrar sesion de la cuenta activa: la cuenta sigue existiendo, solo se sale de ella
  function cerrarSesion() {
    cerrarSesionFirebase();
    borrarSesion();
    setSesion(null);
    setModo('login');
    limpiarEdicion('');
    setGuardado(false);
    setConfirmandoBorrado(false);
    setVentana('');
    setAviso('Cerraste sesión. Tu cuenta sigue existiendo.');
  }

  //olvida una cuenta guardada en el navegador
  function olvidarCuentaGuardada(email) {
    olvidarCuenta(email);
    setCuentas(listarCuentas());
  }

  //formulario de acceso (google + entrar/crear) usado en la portada y en "agregar cuenta"
  function renderAcceso(desdeVentana) {
    return (
      <>
        <button
          type="button"
          onClick={() => entrarConGoogle(desdeVentana)}
          disabled={enviando}
          className="w-full inline-flex items-center justify-center gap-3 px-5 py-2.5 rounded-full bg-white text-black text-sm font-medium border border-zinc-700 transition-all duration-200 hover:bg-zinc-100 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <IconoGoogle />
          Continuar con Google
        </button>

        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span className="flex-1 h-px bg-zinc-700" aria-hidden="true" />
          o
          <span className="flex-1 h-px bg-zinc-700" aria-hidden="true" />
        </div>

        <form onSubmit={(e) => manejarEnvio(e, desdeVentana)} className="space-y-3">
          {modo === 'registro' && (
            <input
              name="nombre"
              type="text"
              value={form.nombre}
              onChange={cambiarCampo}
              placeholder="Tu nombre"
              aria-label="Tu nombre"
              autoComplete="name"
              required
              className={claseInput}
            />
          )}
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={cambiarCampo}
            placeholder="Email"
            aria-label="Email"
            autoComplete="email"
            required
            className={claseInput}
          />
          <input
            name="clave"
            type="password"
            value={form.clave}
            onChange={cambiarCampo}
            placeholder={modo === 'registro' ? 'Contraseña (mínimo 6 caracteres)' : 'Tu contraseña'}
            aria-label="Contraseña"
            autoComplete={modo === 'registro' ? 'new-password' : 'current-password'}
            required
            className={claseInput}
          />
          {error && <p role="alert" className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={enviando}
            className="w-full px-5 py-2.5 rounded-full bg-violeta-app hover:bg-violeta-app/90 text-black text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
          >
            {enviando ? 'Esperá...' : modo === 'registro' ? 'Crear cuenta' : 'Entrar'}
          </button>
        </form>

        {/*el boton de "entrar directamente" desaparece cuando el email ya esta registrado:
            en ese caso solo se avisa que la cuenta existe*/}
        {modo === 'login' && (
          <p className="text-center text-sm text-zinc-400">
            ¿No tenés cuenta?{' '}
            <button
              type="button"
              onClick={() => { setModo('registro'); setError(''); }}
              className="inline-block font-medium text-verde-app rounded-lg px-2 py-1 hover:bg-verde-app/10 hover:text-verde-app/80 active:scale-95 hover:scale-105 transition-all duration-200 cursor-pointer"
            >
              Registrate acá
            </button>
          </p>
        )}

        {/*recuperacion de la contrasena: firebase manda un link al email*/}
        {modo === 'login' && (
          <p className="text-center">
            <a
              href="/recuperar-clave"
              className="inline-block text-sm font-medium text-sky-400 rounded-lg px-2 py-1 hover:bg-sky-500/10 hover:text-sky-300 active:scale-95 hover:scale-105 transition-all duration-200"
            >
              ¿Olvidaste tu contraseña?
            </a>
          </p>
        )}

        <p className="text-xs text-zinc-500 text-center">
          Con tu cuenta podés dejar comentarios en los proyectos. Sin registro podés mirar todo.
        </p>
      </>
    );
  }

  return (
    <section className="max-w-md mx-auto px-4 py-16" aria-label="Perfil">
      <div className="text-center space-y-2 mb-8">
        <h1 className="text-3xl font-extrabold text-white">Perfil</h1>
        <p className="text-zinc-400">
          {!montado
            ? 'Cargando tu perfil...'
            : sesion
              ? `${sesion.nombre}, este es tu perfil`
              : 'No estás registrado: sos Anónimo'}
        </p>
      </div>

      {/*avisos de confirmacion: cambios guardados o cuenta eliminada*/}
      {(guardado || aviso) && (
        <p
          role="status"
          className="mb-4 text-sm text-center px-4 py-2 rounded-xl bg-verde-app/10 border border-verde-app/30 text-verde-app"
        >
          {aviso || 'Cambios guardados'}
        </p>
      )}

      {/*antes de que se lea la sesion del navegador se ve un contenedor vacio,
          para que el html del build y el de la pagina coincidan*/}
      {!montado ? (
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 h-64" aria-hidden="true" />
      ) : sesion ? (
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden">
          <input
            ref={fotoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={cambiarFoto}
          />

          {/*cabecera del perfil: foto, nombre y estado (tipo wsp)*/}
          <div className="flex items-center gap-4 p-6">
            <button
              type="button"
              onClick={() => fotoInputRef.current?.click()}
              aria-label="Cambiar foto de perfil"
              className="group relative shrink-0 cursor-pointer"
            >
              <span className="flex items-center justify-center w-20 h-20 rounded-full overflow-hidden bg-zinc-800 border border-zinc-700 transition-colors group-hover:border-verde-app">
                <AvatarPerfil
                  foto={fotoNueva || sesion.foto}
                  nombre={sesion.nombre}
                  className="w-full h-full object-cover"
                  classNameInicial="text-verde-app font-extrabold text-3xl"
                />
              </span>
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/55 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                <IconoLapiz className="w-4 h-4" />
              </span>
            </button>
            <div className="min-w-0 text-left">
              {/*nombre que se ve en la cabecera: refleja lo que se esta por guardar*/}
              <p className="font-bold text-white text-lg truncate">
                {nombreEditado.trim() || sesion.nombre}
              </p>
              <p className="text-zinc-400 text-sm truncate">{sesion.email}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-xs text-verde-app mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-verde-app" aria-hidden="true"></span>
                  Sesión activa
                </span>
              </div>
            </div>
          </div>

          {/*opciones del perfil: una fila por dato (nombre editable, email fijo)*/}
          <div className="border-t border-zinc-800 divide-y divide-zinc-800">
            <div className="px-6 py-4">
              <p className="text-xs text-zinc-500 mb-1 uppercase tracking-wide">Nombre de usuario</p>
              <input
                type="text"
                maxLength={30}
                value={nombreEditado}
                onChange={(e) => setNombreEditado(e.target.value)}
                aria-label="Nombre de usuario"
                className={claseInput}
              />
              <p className="text-xs text-zinc-500 mt-1">Así te ven los demás en los comentarios.</p>
            </div>

            <div className="px-6 py-4">
              <p className="text-xs text-zinc-500 mb-1 uppercase tracking-wide">Email</p>
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-zinc-100 truncate">{sesion.email}</span>
                <span className="text-xs text-zinc-500 shrink-0">Lo usás para entrar</span>
              </div>
            </div>

            {/*boton general de guardado: maneja cualquier cambio del perfil (nombre y foto)*/}
            <div className="px-6 py-4">
              <button
                type="button"
                onClick={guardarCambios}
                disabled={!hayCambios || guardando}
                className="w-full px-5 py-2.5 rounded-full bg-verde-app hover:bg-verde-app/90 active:bg-verde-app/80 active:scale-95 text-black text-sm font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-verde-app disabled:active:scale-100 cursor-pointer"
              >
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>

            <div className="px-6 py-4 border-t border-zinc-800 space-y-3">
              <p className="text-sm text-zinc-500 text-center">
                Entrá a los proyectos y comentá los que más te gusten.
              </p>
              {error && <p role="alert" className="text-red-400 text-sm text-center">{error}</p>}
              {esDueno && (
                <a
                  href="/admin"
                  className="block w-full px-5 py-2.5 rounded-full bg-verde-app hover:bg-verde-app/90 text-black text-sm font-medium text-center transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  Gestionar mis proyectos
                </a>
              )}
              <button
                type="button"
                onClick={() => {
                  setVentana('cambiar');
                  setError('');
                }}
                className="w-full flex items-center justify-between gap-3 px-5 py-2.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
              >
                <span className="inline-flex items-center gap-2">
                  <svg aria-hidden="true" className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Agregar otra cuenta
                </span>
                <svg aria-hidden="true" className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={cerrarSesion}
                className="w-full px-5 py-2.5 rounded-full bg-zinc-800 hover:bg-zinc-700 hover:text-white active:bg-zinc-600 text-zinc-200 border border-zinc-700 text-sm transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
              >
                Cerrar sesión
              </button>
            </div>

            {/*eliminar la cuenta: va aparte y en rojo, con aviso de lo que se pierde*/}
            <div className="px-6 py-5 border-t border-zinc-800 space-y-3">
              {!confirmandoBorrado ? (
                <>
                  <p className="text-xs text-zinc-400 leading-relaxed text-center">
                    Si tocás <span className="text-red-400 font-semibold">Eliminar cuenta</span> se
                    borran tus conversaciones, tus comentarios y todas las interacciones que hayas
                    tenido en el sitio. Después podés registrarte otra vez con el mismo email, pero
                    empezás de cero.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmandoBorrado(true);
                      setError('');
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-red-500/10 hover:bg-red-500/25 hover:text-red-300 active:bg-red-500/30 text-red-400 border border-red-500/40 text-sm font-medium transition-all duration-200 hover:scale-[1.02] active:scale-95 cursor-pointer"
                  >
                    <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" viewBox="0 0 24 24">
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" />
                    </svg>
                    Eliminar cuenta
                  </button>
                </>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-red-300 text-center font-medium">
                    ¿Seguro que querés eliminar tu cuenta?
                  </p>
                  <p className="text-xs text-zinc-400 text-center leading-relaxed">
                    Se borran {sesion.email}: tu conversación de contacto, tus comentarios y tus
                    interacciones. No se puede deshacer.
                  </p>
          {error && <p role="alert" className="text-red-400 text-sm text-center">{error}</p>}
          {errorExisteCuenta && (
            <button
              type="button"
              onClick={() => {
                setModo('login');
                setError('');
              }}
              className="w-full px-5 py-2.5 rounded-full bg-zinc-800 hover:bg-zinc-700 hover:text-white active:bg-zinc-600 text-zinc-200 border border-zinc-700 text-sm font-medium transition-all duration-200 hover:scale-[1.02] active:scale-95 cursor-pointer"
            >
              Iniciar sesión con esta cuenta
            </button>
          )}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmandoBorrado(false);
                        setError('');
                      }}
                      disabled={borrando}
                      className="px-5 py-2.5 rounded-full bg-zinc-800 hover:bg-zinc-700 hover:text-white active:bg-zinc-600 text-zinc-200 border border-zinc-700 text-sm transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 cursor-pointer"
                    >
                      Mejor no
                    </button>
                    <button
                      type="button"
                      onClick={confirmarBorrado}
                      disabled={borrando}
                      className="px-5 py-2.5 rounded-full bg-red-500 hover:bg-red-400 hover:text-white active:bg-red-600 text-white text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 cursor-pointer"
                    >
                      {borrando ? 'Eliminando...' : 'Sí, eliminar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /*sin sesion: se ve igual el perfil, como "Anonimo", y desde ahi se entra o se crea cuenta*/
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden">
          <div className="flex items-center gap-4 p-6">
            <span
              aria-hidden="true"
              className="shrink-0 flex items-center justify-center w-20 h-20 rounded-full overflow-hidden bg-zinc-800 border border-zinc-700"
            >
              {/*anonimo: la figura generica de usuario, no una inicial*/}
              <svg className="w-11 h-11 text-zinc-500" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </span>
            <div className="min-w-0 text-left">
              <p className="font-bold text-white text-lg truncate">Anónimo</p>
              <p className="text-zinc-400 text-sm truncate">Sin sesión iniciada</p>
              <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" aria-hidden="true"></span>
                Visitante
              </span>
            </div>
          </div>

          {cuentaConfigurada ? (
            <div className="border-t border-zinc-800 p-6 space-y-5">
              <p className="text-sm text-zinc-400 text-center leading-relaxed">
                Para dejar comentarios o mandar mensajes por el chat necesitás un nombre de usuario.
                Creá tu cuenta y te quedás con este mismo perfil.
              </p>
              {renderAcceso(false)}
            </div>
          ) : (
            /*si firebase no esta configurado se avisa que el registro no esta disponible*/
            <div className="border-t border-zinc-800 p-8 space-y-4 text-center">
              <span
                aria-hidden="true"
                className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
              </span>
              <p className="text-zinc-300 text-sm">
                El registro de cuentas todavía no está configurado por la dueña del sitio.
              </p>
            </div>
          )}
        </div>
      )}

      {/*dialogo para cambiar o agregar cuentas (como en ig)*/}
      {ventana && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => { setVentana(''); setError(''); }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={ventana === 'cambiar' ? 'Tus cuentas' : 'Agregar cuenta'}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm max-h-[85vh] overflow-y-auto rounded-2xl bg-zinc-900 border border-zinc-700 p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-white">
                {ventana === 'cambiar' ? 'Tus cuentas' : 'Agregar cuenta'}
              </h2>
              <button
                type="button"
                onClick={() => { setVentana(''); setError(''); }}
                aria-label="Cerrar"
                className="text-zinc-500 hover:text-white hover:bg-zinc-800 active:scale-95 hover:scale-105 rounded-lg p-1 transition-all duration-200 cursor-pointer shrink-0"
              >
                <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {ventana === 'cambiar' ? (
              <>
                <ul className="divide-y divide-zinc-800">
                  <li className="pb-2">
                    <p className="text-xs text-zinc-500">
                      El botón de cada cuenta es solo para cerrar esa sesión. Para borrar una cuenta
                      entera usá “Eliminar cuenta” abajo de tu perfil.
                    </p>
                  </li>
                  {/*cuenta actual, arriba y marcada (como el selector de gmail)*/}
                  <li className="flex items-center gap-3 py-3">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full overflow-hidden bg-zinc-800 border border-zinc-700">
                      <AvatarPerfil
                        foto={sesion.foto}
                        nombre={sesion.nombre}
                        className="w-full h-full object-cover"
                        classNameInicial="text-verde-app font-bold"
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-zinc-100 truncate">{sesion.nombre}</span>
                      <span className="block text-xs text-zinc-500 truncate">{sesion.email}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-verde-app shrink-0">
                      <svg aria-hidden="true" className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                      Sesión actual
                    </span>
                  </li>
                  {cuentas.filter((c) => c.email !== sesion.email).map((cuenta) => (
                    <li key={cuenta.email} className="flex items-center gap-3 py-3">
                      <button
                        type="button"
                        onClick={() => cambiarCuentaActiva(cuenta)}
                        className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer group"
                      >
                        <span className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full overflow-hidden bg-zinc-800 border border-zinc-700">
                          <AvatarPerfil
                            foto={cuenta.foto}
                            nombre={cuenta.nombre}
                            className="w-full h-full object-cover"
                            classNameInicial="text-verde-app font-bold"
                          />
                        </span>
                        <span className="min-w-0">
                          <span className="block font-medium text-zinc-100 truncate">{cuenta.nombre}</span>
                          <span className="block text-xs text-zinc-500 truncate">{cuenta.email}</span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => olvidarCuentaGuardada(cuenta.email)}
                        className="shrink-0 inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 px-2.5 py-1.5 rounded-lg border border-zinc-700 hover:border-zinc-500 active:bg-zinc-700 active:scale-95 hover:scale-105 transition-all duration-200 cursor-pointer"
                      >
                        <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" viewBox="0 0 24 24">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14h4a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-4m0 18-5-5 5-5m5-3 5 5-5 5" />
                        </svg>
                        Cerrar sesión
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => {
                    setVentana('agregar');
                    setModo('login');
                    setForm({ nombre: '', email: '', clave: '' });
                    setError('');
                  }}
                  className="w-full px-5 py-2.5 rounded-full bg-violeta-app hover:bg-violeta-app/90 text-black text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
                >
                  Agregar cuenta
                </button>
              </>
            ) : (
              <div className="space-y-5">{renderAcceso(true)}</div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}