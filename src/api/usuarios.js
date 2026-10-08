//capa de datos para los usuarios del portfolio
//las cuentas viven en firebase authentication; la sesion se guarda en el navegador
//la misma sesion se usa para comentar en los proyectos (el backend valida el token)
import {
  crearCuentaFirebase,
  entrarConEmailFirebase,
  entrarConGoogleFirebase,
  actualizarNombreFirebase,
  traducirErrorFirebase,
  firebaseConfigurado,
  tokenActual,
  cerrarSesionFirebase,
  pedirRecuperacionFirebase,
  verificarLinkRecuperacionFirebase,
  confirmarClaveNuevaFirebase,
  pedirCodigoSmsFirebase,
  confirmarClaveConCodigoSmsFirebase,
} from './firebase.js';
import { peticionGET, peticionGETAutenticada, peticionDELETE } from './client.js';

//se reexporta para que los componentes no tengan que entrar a la capa de firebase
export { cerrarSesionFirebase };

//link al perfil pasandole la pagina de la que se viene
//al entrar o registrarse, el perfil devuelve al usuario a esa misma pagina
//(si esta en /perfil no se manda el parametro, porque ya esta en su lugar)
export function linkPerfil(modo = 'login') {
  //en el servidor (build) no hay ventana: se cae en el link simple y el navegador lo completa
  if (typeof window === 'undefined') {
    return modo === 'registro' ? '/perfil?modo=registro' : '/perfil';
  }
  const enPerfil = window.location.pathname.startsWith('/perfil');
  const volver = enPerfil ? '' : window.location.pathname + window.location.search;
  const params = new URLSearchParams();
  if (modo === 'registro') params.set('modo', 'registro');
  if (volver) params.set('volver', volver);
  const query = params.toString();
  return `/perfil${query ? `?${query}` : ''}`;
}

//true cuando la plataforma de cuentas esta configurada (variables public_firebase_*)
export const cuentaConfigurada = firebaseConfigurado;

//dice si la cuenta logueada es la dueña del sitio (para ofrecerle el panel)
//el backend lo verifica con el token; no expone el email de la dueña
export async function soyDueno() {
  const sesion = await sesionConTokenFresco();
  if (!sesion?.token) return false;
  try {
    const { esDueno } = await peticionGETAutenticada('/api/admin/soy-dueno', sesion.token);
    return Boolean(esDueno);
  } catch {
    return false;
  }
}

//crea la cuenta en firebase: nombre, email y contraseña. devuelve usuario y token
export async function registrarUsuario(datos) {
  try {
    const sesion = await crearCuentaFirebase(datos);
    return {
      token: sesion.token,
      usuario: { nombre: sesion.nombre, email: sesion.email, foto: sesion.foto },
    };
  } catch (error) {
    throw new Error(traducirErrorFirebase(error));
  }
}

//entra con email y contraseña. devuelve usuario y token
export async function iniciarSesion(datos) {
  try {
    const sesion = await entrarConEmailFirebase(datos);
    return {
      token: sesion.token,
      usuario: { nombre: sesion.nombre, email: sesion.email, foto: sesion.foto },
    };
  } catch (error) {
    throw new Error(traducirErrorFirebase(error));
  }
}

//entra con una cuenta de google. devuelve usuario y token
export async function entrarConGoogle() {
  try {
    const sesion = await entrarConGoogleFirebase();
    return {
      token: sesion.token,
      usuario: { nombre: sesion.nombre, email: sesion.email, foto: sesion.foto },
    };
  } catch (error) {
    throw new Error(traducirErrorFirebase(error));
  }
}

//recuperacion de contraseña por email: firebase manda el link al buzon
export async function pedirRecuperacionClave(email) {
  try {
    await pedirRecuperacionFirebase(email);
  } catch (error) {
    throw new Error(traducirErrorFirebase(error));
  }
}

//revisa el link que llego por email y devuelve a que cuenta pertenece
export async function verificarLinkRecuperacion(oobCode) {
  try {
    return await verificarLinkRecuperacionFirebase(oobCode);
  } catch (error) {
    throw new Error(traducirErrorFirebase(error));
  }
}

//pone la contraseña nueva usando el codigo del link del email
export async function guardarClaveNueva(oobCode, claveNueva) {
  try {
    await confirmarClaveNuevaFirebase(oobCode, claveNueva);
  } catch (error) {
    throw new Error(traducirErrorFirebase(error));
  }
}

//consulta al backend con que metodos se puede recuperar una clave en este sitio
//(por email siempre; por sms solo si hay proveedor de telefono configurado en firebase)
export async function metodosRecuperacion() {
  try {
    const { metodos } = await peticionGET('/api/usuarios/metodos-recuperacion');
    return { email: true, sms: Boolean(metodos?.sms) };
  } catch {
    return { email: true, sms: false };
  }
}

//pide el codigo de sms al numero indicado (solo si el proyecto de firebase tiene proveedor)
export async function pedirCodigoSms(telefono, contenedorId) {
  try {
    return await pedirCodigoSmsFirebase(telefono, contenedorId);
  } catch (error) {
    throw new Error(traducirErrorFirebase(error));
  }
}

//confirma el codigo de sms y deja puesta la contraseña nueva
export async function guardarClaveNuevaConSms(confirmacion, codigo, claveNueva) {
  try {
    await confirmarClaveConCodigoSmsFirebase(confirmacion, codigo, claveNueva);
  } catch (error) {
    throw new Error(traducirErrorFirebase(error));
  }
}

//sesion del usuario que comenta: se guarda en el localstorage del navegador
const CLAVE_SESION = 'sesion-usuario';
//lista de cuentas guardadas en el navegador (para cambiar de cuenta como en ig)
const CLAVE_CUENTAS = 'cuentas-usuario';

export function leerSesion() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_SESION) ?? 'null');
  } catch {
    return null;
  }
}

//avisa al resto de la pagina que la sesion cambio, asi el avatar del navbar se actualiza solo
//(guardarSesion y borrarSesion lo disparan solas)
function avisarSesion() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('sesion-usuario'));
}

export function guardarSesion(sesion) {
  try {
    localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
  } catch {}
  avisarSesion();
}

export function borrarSesion() {
  try {
    localStorage.removeItem(CLAVE_SESION);
  } catch {}
  avisarSesion();
}

//el token guardado en el navegador caduca (firebase dura una hora) y la api responde 401
//esta funcion devuelve la sesion con un token siempre fresco, o null si ya no hay sesion
export async function sesionConTokenFresco() {
  const sesion = leerSesion();
  if (!sesion?.email) return null;

  const token = await tokenActual();
  //si firebase ya no tiene sesion, la del navegador esta vencida: se limpia
  if (!token) {
    if (sesion.token) borrarSesion();
    return null;
  }

  const nueva = { ...sesion, token };
  guardarSesion(nueva);
  guardarCuenta(nueva);
  return nueva;
}

//guarda una nueva foto de perfil en la sesion (se elige desde "mi cuenta")
//devuelve la sesion actualizada para refrescar la pantalla
export function actualizarFoto(foto) {
  const sesion = leerSesion();
  const nueva = { ...(sesion ?? { nombre: '', email: '', token: '' }), foto };
  guardarSesion(nueva);
  return nueva;
}

//cambia el nombre de usuario en firebase y refresca la sesion guardada
//conserva la foto local (la de google o la que subio la persona)
export async function actualizarNombre(nombre) {
  const sesion = await actualizarNombreFirebase(nombre);
  const previa = leerSesion() ?? {};
  const nueva = {
    ...previa,
    token: sesion.token,
    nombre: sesion.nombre,
    email: sesion.email,
    foto: previa.foto ?? sesion.foto ?? '',
  };
  guardarSesion(nueva);
  return nueva;
}

//elimina la cuenta de la persona: borra en el backend la conversacion y los comentarios,
//cierra la sesion de firebase y olvida la cuenta en este navegador
//despues se puede volver a registrar con el mismo email, pero sin conversaciones ni comentarios
export async function eliminarCuenta() {
  const sesion = leerSesion();
  if (!sesion?.token) throw new Error('No hay una sesión activa. Volvé a entrar con tu cuenta.');

  //el token puede estar vencido: se pide uno fresco antes de borrar
  const vigente = await sesionConTokenFresco();
  if (!vigente?.token) throw new Error('Tu sesión venció. Volvé a entrar con tu cuenta.');

  const respuesta = await peticionDELETE('/api/usuarios/mi', vigente.token);

  await cerrarSesionFirebase();
  olvidarCuenta(vigente.email);
  borrarSesion();
  return respuesta;
}

//devuelve las cuentas guardadas en el navegador (varias cuentas como en ig)
export function listarCuentas() {
  try {
    const lista = JSON.parse(localStorage.getItem(CLAVE_CUENTAS) ?? '[]');
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

//guarda (o actualiza) una cuenta en la lista de cuentas del navegador
export function guardarCuenta(cuenta) {
  const lista = listarCuentas().filter((c) => c.email !== cuenta.email);
  lista.push(cuenta);
  try {
    localStorage.setItem(CLAVE_CUENTAS, JSON.stringify(lista));
  } catch {
    //si se llena el espacio (por fotos pesadas) se conserva la cuenta activa sola
  }
  return lista;
}

//olvida una cuenta guardada (no borra la cuenta de firebase)
export function olvidarCuenta(email) {
  const lista = listarCuentas().filter((c) => c.email !== email);
  try {
    localStorage.setItem(CLAVE_CUENTAS, JSON.stringify(lista));
  } catch {}
  return lista;
}