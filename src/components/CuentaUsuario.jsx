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
  soyDueno,
  sesionConTokenFresco,
  eliminarCuenta,
  cerrarSesionFirebase,
} from '../api/usuarios.js';
import { comprimirImagen } from '../utils/imagen.js';

const claseInput = // define los estilos css reutilizables para los campos de texto
  'w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-violeta-app transition-all';

function IconoGoogle() {//dibuja el icono svg de google para el boton de acceso rapido
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

function AvatarPerfil({ foto, nombre, className, classNameInicial }) { //muestra la foto de perfil o la inicial del nombre si la img falla o no existe
  const [falla, setFalla] = useState(false);//estado local para detectar si la carga de la img da error
  useEffect(() => { //resetea el estado de fallo cada vez que cambia la url de la foto
    setFalla(false);
  }, [foto]);

  if (foto && !falla) {//si hay foto y no fallo la dibuja como etiqueta img
    return <img src={foto} alt="" className={className} onError={() => setFalla(true)} />;
  }
  return (
    <span aria-hidden="true" className={classNameInicial}>
      {(nombre ?? '?').charAt(0).toUpperCase() || '?'}
    </span>
  );
}

function esRutaInterna(ruta) {//valida que la ruta de redireccion pertenezca al propio sitio web
  return typeof ruta === 'string' && ruta.startsWith('/') && !ruta.startsWith('//');
}

//sinEncabezado: se usa cuando la cuenta se embebe dentro del panel admin, para no repetir el titulo
//ocultarAccesoAdmin: esconde el boton "Gestionar mis proyectos" cuando ya se esta en el panel
//accionInicial: { tipo, n } que dispara el panel (foto | nombre | cuenta | eliminar) al tocar una opcion del menu
//ocultarPerfil: deja montado solo el dialogo de cuentas (se usa en el panel cuando solo se pide "Agregar otra cuenta")
export default function CuentaUsuario({ //componente principal para gestionar la cuenta de usuario, inicio de sesion y perfil
  sinEncabezado = false,
  ocultarAccesoAdmin = false,
  accionInicial = null,
  ocultarPerfil = false,
}) {

  const [montado, setMontado] = useState(false);//define si el componente ya esta montado en el navegador para evitar errores de hidratacion
  const [sesion, setSesion] = useState(null);//almacena los datos de la sesion actual del usuario
  const [modo, setModo] = useState(() => {//define si el formulario actual esta en modo login leyendo los parametros de la url
    if (typeof window === 'undefined') return 'login';
    return new URLSearchParams(window.location.search).get('modo') === 'registro' ? 'registro' : 'login';
  });

  const [volver] = useState(() => {// guarda la ruta de origen para volver a ella despues de iniciar sesion
    if (typeof window === 'undefined') return '';
    const pedido = new URLSearchParams(window.location.search).get('volver') ?? '';
    return esRutaInterna(pedido) ? pedido : '';
  });
  const [form, setForm] = useState({ nombre: '', email: '', clave: '' });//almacena los valores temporales del formulario de acceso
  const [enviando, setEnviando] = useState(false);//indica si hay una peticion de red en curso para bloquear botones
  const [error, setError] = useState('');//guarda los msj de error devueltos por la api
  const [esDueno, setEsDueno] = useState(false);//define si la cuenta pertenece a admin
  const fotoInputRef = useRef(null);//referencia al elemento input de tipo file oculto para cambiar la foto
  const nombreInputRef = useRef(null);//referencia al input de texto del nombre para enfocarlo al editar
  const [nombreEditado, setNombreEditado] = useState('');//guarda el nombre editado temporalmente antes de guardarlo
  const [fotoNueva, setFotoNueva] = useState(null);//almacena el archivo de la nueva foto seleccionada
  const [guardando, setGuardando] = useState(false);//indica si se estan guardando los cambios del perfil
  const [ventana, setVentana] = useState('');//controla la apertura y tipo de los modales de gestion de cuentas
const [confirmandoBorrado, setConfirmandoBorrado] = useState(false);//controla si se esta mostrando el aviso de confirmacion para eliminar la cuenta
const [borrando, setBorrando] = useState(false);//indica si se esta ejecutando la eliminacion definitiva de la cuenta
const [guardado, setGuardado] = useState(false);//controla el estado de exito al guardar cambios
const [aviso, setAviso] = useState('');//almacena avisos efimeros para mostrar notificaciones flotantes
const [cuentas, setCuentas] = useState(() => listarCuentas());//lista las cuentas secundarias guardadas en el almacenamiento local del navegador

const hayCambios = // calcula si existen modificaciones sin guardar en el perfil del usuario
    Boolean(fotoNueva) || nombreEditado.trim() !== (sesion?.nombre ?? '').trim();

  //el dialogo de cuentas se cierra con Escape
  useEffect(() => { //agrega un escuchador de teclado para cerrar los modales al presionar la tecla escape
    if (!ventana) return undefined;
    const alPresionar = (e) => {
      if (e.key === 'Escape') {
        setVentana('');
        setError('');
      }
    };
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, [ventana]);

  useEffect(() => {//lee la sesion guardada al cargar el componente y refresca el token con firebase
    const guardada = leerSesion();
    setSesion(guardada);
    setNombreEditado(guardada?.nombre ?? '');
    setMontado(true);
    //reconcilia con firebase: si la sesion guardada quedo desfasada de la cuenta real, se corrige
    sesionConTokenFresco()
      .then((nueva) => {
        if (!nueva) return;
        setSesion(nueva);
        setNombreEditado((actual) => actual || nueva.nombre);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {// detecta si se navego para cambiar de cuenta y limpia la sesion anterior antes de pedir credenciales
    const pendiente = sessionStorage.getItem('cuenta-a-cambiar');
    if (!pendiente) return;
    sessionStorage.removeItem('cuenta-a-cambiar');
    cerrarSesionFirebase().catch(() => {});
    borrarSesion();
    setSesion(null);
    setNombreEditado('');
    setModo('login');
    setForm({ nombre: '', email: pendiente, clave: '' });
    setVentana('');
    setGuardado(false);
    setConfirmandoBorrado(false);
    setAviso(`Entrá con la contraseña de ${pendiente} para cambiar de cuenta.`);
  }, []);

  useEffect(() => {//redirige automaticamente al panel de administracion si la cuenta logueada es admin
    if (sinEncabezado || !sesion?.email) return;// si no hay encabezado o el usuario no tiene email guardado no hace nada y sale
    let vivo = true;//crea una bandera booleana para verificar que el componente sigue montado
    soyDueno()// llama a la funcion de la api para verificar si el usuario actual es dueño del sitio
      .then((es) => {
        if (es && vivo) window.location.assign('/admin');//si el usuario es dueño y el componente sigue vivo redirige a la pag de admin
      })
      .catch(() => {});
    return () => {//funcion de limpieza que desactiva la bandera cuando el componente se desmonta
      vivo = false;
    };
  }, [sesion?.email, sinEncabezado]);

  //dice si la cuenta logueada es la dueña del sitio (para mostrar el acceso al panel)
  useEffect(() => {
    if (!sesion?.email) {// si no hay un email de sesion activo
      setEsDueno(false);//establece que no es dueño y sale de la funcion
      return;
    }
    let activo = true;//crea un interruptor activo para controlar el ciclo de vida del efecto
    soyDueno()//consulta al servidor si el usuario actual tiene permisos de dueño
      .then((es) => {
        if (activo) setEsDueno(es);//si el componente sigue activo actualiza el estado con el resultado obtenido
      })
      .catch(() => {});
    return () => {//funcion de limpieza que apaga el interruptor cuando el componente se desmonta
      activo = false;
    };
  }, [sesion?.email]);//se ejecuta cada vez que cambia el correo de la sesion actual

  //cuando desde el menu del panel admin se pide "cambiar foto", "cambiar nombre",
  //"agregar otra cuenta" o "eliminar cuenta", se abre directamente esa accion
  useEffect(() => {//ejecuta acciones automaticas en el perfil cuando se pasa un parametro inicial desde el panel
    if (!sesion || !accionInicial?.tipo) return;//si no hay una sesion activa o no viene ninguna accion inicial definida, no hace nada y sale
    const tipo = accionInicial.tipo;//guarda el tipo de accion solicitada en una constante local
    if (tipo === 'foto') {//si el tipo de accion es cambiar la foto
      fotoInputRef.current?.click();//hace clic de forma programatica en el input oculto de archivos para abrir el selector de imagenes
    } else if (tipo === 'nombre') {//si el tipo de accion es cambiar el nombre
      nombreInputRef.current?.focus();//enfoca el campo de texto del nombre para que el usuario pueda empezar a escribir de inmediato
    } else if (tipo === 'cuenta') {//si el tipo de accion es cambiar de cuenta
      setError('');//limpia cualquier error anterior de la pantalla
      setVentana('cambiar');//y abre la ventana modal para gestionar o cambiar de cuenta
    } else if (tipo === 'eliminar') {//si el tipo de accion es eliminar la cuenta
      setError('');//limpia cualquier error anterior
      setConfirmandoBorrado(true);//y activa el dialogo de confirmacion para borrar la cuenta permanentemente
    }
    //cada toque del menu manda un objeto nuevo (con su marca "n"); por eso reacciona
  }, [accionInicial, sesion]);

  //guarda la sesion devuelta por firebase, la suma a las cuentas guardadas y actualiza la pantalla
  //si viene del dialogo "agregar cuenta", al final lo cierra
  //si se entro desde otra pagina para comentar o escribir, se vuelve a esa pagina
  function aplicarSesion(respuesta, desdeVentana = false) {//guarda los datos de la sesion autenticada en el almacenamiento local y actualiza los estados
    const nuevaSesion = {//crea un objeto estructurado con la informacion clave del usuario autenticado
      token: respuesta.token,
      nombre: respuesta.usuario.nombre,
      email: respuesta.usuario.email,
      foto: respuesta.usuario.foto ?? '',
    };
    guardarCuenta(nuevaSesion);//guarda la cuenta actual dentro de la lista de cuentas almacenadas en el navegador
    setCuentas(listarCuentas());//actualiza el estado local con la lista renovada de cuentas guardadas
    guardarSesion(nuevaSesion);//guarda la sesion activa actual en el almacenamiento local del sistema
    setSesion(nuevaSesion);//actualiza el estado de la sesion en el componente con los nuevos datos
    setForm({ nombre: '', email: '', clave: '' });//blanquea y limpia los campos de texto del formulario de acceso
    limpiarEdicion(nuevaSesion.nombre);//restablece los campos de edicion del perfil usando el nombre nuevo
    if (desdeVentana) setVentana('');//si el proceso se hizo desde el dialogo de cuentas, cierra la ventana modal
    //vuelve al punto de partida (la pagina donde estaba antes de registrarse)
    if (volver) window.location.assign(volver);
  }

  function limpiarEdicion(nombre) {//deja los campos de edicion como los datos guardados
    setNombreEditado(nombre ?? '');//actualiza el estado del nombre editado con el valor recibido o un texto vacio si no viene nada
    setFotoNueva(null);//resetea el estado de la nueva foto seleccionada dejandolo en nulo
    setError('');//limpia cualquier mensaje de error que estuviera visible en la pantalla
  }

  async function cambiarFoto(e) { //elige una foto de perfil: se comprime y queda lista para guardar con el boton general
    const archivo = e.target.files?.[0];//obtiene el primer archivo seleccionado por el usuario desde el input de tipo file
    if (!archivo) return;//si el usuario no selecciono ningun archivo, sale de la funcion y no hace nada
    setError('');//limpia cualquier mensaje de error que estuviera visible en la pantalla
    try {
      setFotoNueva(await comprimirImagen(archivo));//comprime la imagen seleccionada de forma asincronica y la guarda como foto nueva pendiente
    } catch (err) {
      setError(err.message);//si ocurre un error durante la compresion, captura el mensaje y lo muestra en pantalla
    }
  }

  async function guardarCambios() {// guarda los cambios realizados del perfil comunicandose con el backend
    if (guardando || !hayCambios) return;//si ya se esta guardando o no hay cambios pendientes de guardar, sale de la funcion
    const nombreLimpio = nombreEditado.trim();//quita los espacios en blanco sobrantes del nombre editado
    if (!nombreLimpio) {//si el nombre queda vacio
      setError('El nombre no puede estar vacío.');//muestra un mensaje de error y detiene la ejecucion
      return;
    }

    setGuardando(true);//activa el estado de guardado para bloquear los botones mientras procesa
    setError('');//limpia cualquier mensaje de error
    try {
      let sesionActual = sesion;//asigna la sesion actual a una variable auxiliar para ir actualizandola
      if (nombreLimpio !== sesion?.nombre) {//el nombre vive en firebase (para que lo vean los demas al comentar)
        sesionActual = await actualizarNombre(nombreLimpio);// actualiza el nombre en el servidor a traves de la api
      }
      if (fotoNueva) {//la foto se guarda solo en el navegador de esta persona
        sesionActual = actualizarFoto(fotoNueva);// actualiza la foto de perfil de manera local
      }
      if (sesionActual) {// si se obtuvo una sesion actualizada correctamente
        guardarCuenta(sesionActual);//guarda la cuenta actualizada en el almacenamiento local
        setCuentas(listarCuentas());//actualiza el estado con la lista de cuentas renovada
        setSesion(sesionActual);//actualiza el estado de la sesion activa en la pantalla
      }
      limpiarEdicion(sesionActual?.nombre ?? nombreLimpio);// limpia los campos de edicion usando el nombre definitivo
    } catch (err) { 
      setError(err.message);//si ocurre algun error en el proceso, lo captura y lo muestra en pantalla
    } finally {
      setGuardando(false);//pase lo que pase, al terminar desactiva el estado de guardado
    }
  }

  useEffect(() => {//oculta los mensajes efimeros de aviso despues de dos segundos
    if (!guardado && !aviso) return undefined; //si no hay un estado de guardado activo ni ningun aviso escrito, no hace nada y sale
    const t = setTimeout(() => {//configura un temporizador para limpiar y apagar los avisos despues de dos segundos
      setGuardado(false);//desactiva el indicador de guardado
      setAviso('');//limpia el texto del aviso flotante
    }, 2000);
    return () => clearTimeout(t);//funcion de limpieza que borra el temporizador si el componente se desmonta o cambian las dependencias
  }, [guardado, aviso]);

  async function confirmarBorrado() {//ejecuta la eliminacion de la cuenta de usuario y limpia la sesion local
    if (borrando) return;//si ya se esta ejecutando la eliminacion, sale de la funcion para evitar duplicados
    setBorrando(true);//activa el estado de borrado para bloquear las acciones mientras procesa
    setError('');//limpia cualquier mensaje de error anterior que estuviera visible
    try {
      await eliminarCuenta();//llama a la api para eliminar permanentemente la cuenta en el servidor
      setSesion(null);// la cuenta ya no existe: se vuelve a la pantalla de acceso
      setCuentas(listarCuentas());//actualiza la lista de cuentas guardadas en el navegador
      setModo('login'); //cambia el modo de la vista a inicio de sesion
      setVentana('');//cierra cualquier ventana modal abierta
      setConfirmandoBorrado(false);//oculta el dialogo de confirmacion de borrado
      setGuardado(false);//desactiva el indicador general de guardado
      setAviso('Tu cuenta se eliminó. Se borraron tus conversaciones, comentarios e interacciones.');
    } catch (err) {
      setError(err.message);// si ocurre un error, muestra el mensaje correspondiente y cierra el dialogo de confirmacion
      setConfirmandoBorrado(false);
    } finally {
      setBorrando(false);// pase lo que pase, al finalizar desactiva el estado de borrado
    }
  }

  //entra con una cuenta de google (firebase abre el selector de cuentas)
  //desdeVentana: true cuando se agrega otra cuenta desde el dialogo
  async function entrarConGoogle(desdeVentana = false) {
    if (enviando) return;// si ya se esta procesando otra peticion de envio, sale de la funcion para evitar duplicados
    setEnviando(true);// activa el estado de envio para bloquear los botones mientras se abre la ventana de google
    setError('');// limpia cualquier mensaje de error anterior que estuviera visible en la pantalla
    try {
      aplicarSesion(await entrarConGoogleCuenta(), desdeVentana);//espera a que firebase autentique con google y aplica la sesion obtenida, pasando el indicador de ventana
    } catch (err) {
      setError(err.message);//si ocurre algun error durante el proceso de acceso, captura el mensaje y lo muestra en pantalla
    } finally {
      setEnviando(false);//pase lo que pase, al terminar desactiva el estado de envio
    }
  }

  function cambiarCampo(e) {//actualiza los campos de texto del formulario al escribir el usuario
    setForm({ ...form, [e.target.name]: e.target.value });// toma el objeto de estado anterior del formulario y sobreescribe unicamente la propiedad
  // cuyo nombre coincide con el atributo 'name' del input que genero el evento, asignandole su nuevo valor
  }

  async function manejarEnvio(e, desdeVentana = false) {//registro o login: guarda la sesion y muestra los datos del usuario
    e.preventDefault();//previene el comportamiento por defecto de recarga de la pagina al enviar el formulario html
    if (enviando) return;//si ya se esta procesando una solicitud de envio, sale de la funcion para evitar envios duplicados
    setEnviando(true);//activa el estado de envio para bloquear los elementos del formulario mientras procesa
    setError('');// limpia cualquier mensaje de error previo que estuviera visible en la pantalla
    try {
      const respuesta = modo === 'registro' ? await registrarUsuario(form) : await iniciarSesion(form);//evalua si el modo actual es de registro o inicio de sesion, llamando a la funcion correspondiente de la api
      aplicarSesion(respuesta, desdeVentana);//procesa la respuesta obtenida aplicando y guardando la nueva sesion del usuario
    } catch (err) {
      setError(err.message);//si ocurre algun error durante el registro o login, captura el mensaje y lo muestra en pantalla
    } finally {
      setEnviando(false);//pase lo que pase, al finalizar la operacion desactiva el estado de envio
    }
  }

  //cambia a otra cuenta guardada. firebase mantiene una sola sesion activa: no se puede
  //"cambiar" sin volver a entrar, asi que se cierra la sesion actual ANTES de ir al perfil
  //(si se cerrara alla, alguna llamada en vuelo podria resucitar la cuenta anterior)
  //y al llegar queda el formulario listo con el email de la otra cuenta
  async function cambiarCuentaActiva(cuenta) {
    sessionStorage.setItem('cuenta-a-cambiar', cuenta.email); //guarda temporalmente en el almacenamiento de sesion el correo de la cuenta a la que se quiere cambiar
    try {
      await cerrarSesionFirebase();// intenta cerrar la sesion activa actual en firebase de manera asincronica
    } catch {}
    borrarSesion();//borra los datos de la sesion actual del almacenamiento local del navegador
    window.location.assign('/perfil');//redirige la ventana del navegador hacia la pagina de perfil para iniciar con la nueva cuenta
  }

  //cierra la sesion activa actual conservando la cuenta registrada en el sistema
  function cerrarSesion() {
    cerrarSesionFirebase();// cierra la sesion activa en firebase de forma remota
    borrarSesion();// borra los datos de la sesion almacenados localmente en el navegador
    setSesion(null);// limpia el estado de la sesion actual dejandolo en nulo
    setModo('login');// cambia el modo del formulario de vuelta al inicio de sesion
    limpiarEdicion('');// limpia los campos de edicion del perfil pasando un texto vacio
    setGuardado(false);// desactiva el indicador general de guardado
    setConfirmandoBorrado(false);// oculta el dialogo de confirmacion para borrar la cuenta
    setVentana('');// cierra cualquier ventana modal que estuviera abierta
    setAviso('Cerraste sesión. Tu cuenta sigue existiendo.');// muestra un aviso flotante informando que se cerro la sesion pero la cuenta sigue existiendo
  }

  //elimina una cuenta guardada de la lista secundaria almacenada localmente
  function olvidarCuentaGuardada(email) {
    olvidarCuenta(email);// llama a la funcion de la api para remover el correo especificado de las cuentas guardadas en el navegador
    setCuentas(listarCuentas());// actualiza el estado local obteniendo la lista renovada de cuentas almacenadas
  }

  //formulario de acceso (google + entrar/crear) usado en la portada y en "agregar cuenta"
  function renderAcceso(desdeVentana) {
    return (
      <>
      {/* boton para iniciar sesion rapidamente usando una cuenta de google */}
        <button
          type="button"
          onClick={() => entrarConGoogle(desdeVentana)}
          disabled={enviando}
          className="w-full inline-flex items-center justify-center gap-3 px-5 py-2.5 rounded-full bg-white text-black text-sm font-medium border border-zinc-700 transition-all duration-200 hover:bg-zinc-100 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <IconoGoogle />
          Continuar con Google
        </button>
      {/* separador visual con la letra "o" en el medio para dividir las opciones de acceso */}
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span className="flex-1 h-px bg-zinc-700" aria-hidden="true" />
          o
          <span className="flex-1 h-px bg-zinc-700" aria-hidden="true" />
        </div>

       {/* formulario principal para ingresar con correo y contraseña o registrarse */} 
        <form onSubmit={(e) => manejarEnvio(e, desdeVentana)} className="space-y-3">
          {/* si el modo actual es registro, muestra un campo adicional para pedir el nombre del usuario */}
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
          {/* campo de texto para ingresar el correo electronico */}
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
          {/* campo de texto para ingresar la contraseña, con texto adaptable segun el modo */}
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
          {/* si existe algun mensaje de error, lo muestra en pantalla resaltado en rojo */}
          {error && <p role="alert" className="text-red-400 text-sm">{error}</p>}
          
          {/* boton principal de envio del formulario, cambia su texto segun el estado y el modo */}
          <button
            type="submit"
            disabled={enviando}
            className="w-full px-5 py-2.5 rounded-full bg-verde-app hover:bg-verde-app/90 text-black text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
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
              className="inline-block font-medium text-violeta-app rounded-lg px-2 py-1 hover:bg-violeta-app/10 hover:text-violeta-app/80 active:scale-95 hover:scale-105 transition-all duration-200 cursor-pointer"
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

        {/* texto informativo explicando que el registro es opcional solo para comentar */}
        <p className="text-xs text-zinc-500 text-center">
          Con tu cuenta podés dejar comentarios en los proyectos. Sin registro podés mirar todo.
        </p>
      </>
    );
  }

  return (// seccion principal del componente que renderiza la vista completa del perfil de usuario
    <section
      className={sinEncabezado ? '' : 'max-w-md mx-auto px-4 py-16'}
      aria-label="Perfil"
    >
      {/* cabecera principal del perfil que muestra el titulo y el estado actual de la sesion */}
      {!ocultarPerfil && !sinEncabezado && (
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
      )}

      {/*avisos de confirmacion: flotan arriba a la derecha y desaparecen solos*/}
      {!ocultarPerfil && (guardado || aviso) && (
        <p
          role="status"
          className="fixed top-20 right-4 z-[60] max-w-[calc(100vw-2rem)] sm:max-w-sm text-sm px-4 py-2 rounded-lg border border-violeta-app/30 bg-violeta-app/10 text-violeta-app shadow-lg backdrop-blur-sm pointer-events-none animacion-aparecer"
        >
          {aviso || 'Cambios guardados'}
        </p>
      )}

      {/* contenedor condicional que muestra la interfaz segun el estado de montaje y la sesion del usuario */}
      {!ocultarPerfil && (!montado ? (
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 h-64" aria-hidden="true" />
      ) : sesion ? (
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden">
          {/* input de tipo archivo oculto para seleccionar y actualizar la foto de perfil */}
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
              <span className="flex items-center justify-center w-20 h-20 rounded-full overflow-hidden bg-zinc-800 border border-zinc-700 transition-colors group-hover:border-violeta-app">
                <AvatarPerfil
                  foto={fotoNueva || sesion.foto}
                  nombre={sesion.nombre}
                  className="w-full h-full object-cover"
                  classNameInicial="text-violeta-app font-extrabold text-3xl"
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
              <div className="flex items-center gap-2 flex-wrap mt-1">
                <span className="inline-flex items-center gap-1.5 text-xs text-violeta-app">
                  <span className="w-1.5 h-1.5 rounded-full bg-violeta-app" aria-hidden="true"></span>
                  Sesión activa
                </span>
                {/*la cuenta de la dueña se marca aca, ademas del acceso al panel de abajo*/}
                {esDueno && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-black bg-violeta-app rounded-full px-2 py-0.5">
                    <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
                    </svg>
                    Dueña del sitio
                  </span>
                )}
              </div>
            </div>
          </div>

          {/*opciones del perfil: una fila por dato (nombre editable, email fijo)*/}
          <div className="border-t border-zinc-800 divide-y divide-zinc-800">
            <div className="px-6 py-4">
              <p className="text-xs text-zinc-500 mb-1 uppercase tracking-wide">Nombre de usuario</p>
              <input
                ref={nombreInputRef}
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

            {/*boton general de guardado: guarda los cambios del perfil (nombre y foto)*/}
            <div className="px-6 py-4">
              <button
                type="button"
                onClick={guardarCambios}
                disabled={!hayCambios || guardando}
                className="w-full px-5 py-2.5 rounded-full bg-violeta-app hover:bg-violeta-app/90 active:bg-violeta-app/80 active:scale-95 text-black text-sm font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-violeta-app disabled:active:scale-100 cursor-pointer"
              >
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>

            <div className="px-6 py-4 border-t border-zinc-800 space-y-3">
              <p className="text-sm text-zinc-500 text-center">
                Entrá a los proyectos y comentá los que más te gusten.
              </p>
              {error && <p role="alert" className="text-red-400 text-sm text-center">{error}</p>}
              {esDueno && !ocultarAccesoAdmin && (
                <a
                  href="/admin"
                  className="block w-full px-5 py-2.5 rounded-full bg-violeta-app hover:bg-violeta-app/90 text-black text-sm font-medium text-center transition-all duration-200 hover:scale-105 active:scale-95"
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
        /* vista alternativa para usuarios anonimos que muestra la opcion de ingresar o registrarse */
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
      ))}

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
                        classNameInicial="text-violeta-app font-bold"
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-zinc-100 truncate">{sesion.nombre}</span>
                      <span className="block text-xs text-zinc-500 truncate">{sesion.email}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-violeta-app shrink-0">
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
                            classNameInicial="text-violeta-app font-bold"
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
                  className="w-full px-5 py-2.5 rounded-full bg-verde-app hover:bg-verde-app/90 text-black text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
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