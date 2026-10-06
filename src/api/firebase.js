//capa de firebase para los usuarios del portfolio
//las cuentas se crean y se administran en firebase authentication (plataforma integrada)
//con email/clave o con una cuenta de google se obtiene un token que valida despues el backend
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile,
  getAuth,
  onIdTokenChanged,
  signOut,
  sendPasswordResetEmail,
  checkActionCode,
  confirmPasswordReset,
  RecaptchaVerifier,
} from 'firebase/auth';

//configuracion publica del proyecto de firebase
//se define como variables public_firebase_* (en vercel o en el .env local)
const config = {
  apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY,
  authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
  appId: import.meta.env.PUBLIC_FIREBASE_APP_ID,
};

//si falta la configuracion el sitio sigue andando, solo no se pueden crear cuentas
export const firebaseConfigurado = Boolean(
  config.apiKey && config.authDomain && config.projectId && config.appId
);

//devuelve la app de firebase ya inicializada (o inicializa la primera vez)
function obtenerAuth() {
  if (!firebaseConfigurado) {
    throw new Error('El acceso con cuentas todavía no está configurado por la dueña del sitio.');
  }
  if (!getApps().length) initializeApp(config);
  return getAuth(getApp());
}

//arma el perfil de sesion con el token firmado por firebase
async function sesionDesdeUsuario(usuarioFirebase) {
  const token = await usuarioFirebase.getIdToken();
  return {
    token,
    //nombre elegido por el usuario; si no hay, se usa el de antes de la arroba del correo
    nombre:
      usuarioFirebase.displayName ||
      (usuarioFirebase.email ? usuarioFirebase.email.split('@')[0] : 'Visitante'),
    email: usuarioFirebase.email,
    //la foto puede venir de la cuenta de google o elegirse despues desde "mi cuenta"
    foto: usuarioFirebase.photoURL || '',
  };
}

//crea la cuenta con email y contraseña en firebase
export async function crearCuentaFirebase({ nombre, email, clave }) {
  const credenciales = await createUserWithEmailAndPassword(obtenerAuth(), email, clave);
  if (nombre) {
    await updateProfile(credenciales.user, { displayName: String(nombre).trim() });
  }
  return sesionDesdeUsuario(credenciales.user);
}

//entra con email y contraseña a firebase
export async function entrarConEmailFirebase({ email, clave }) {
  const credenciales = await signInWithEmailAndPassword(obtenerAuth(), email, clave);
  return sesionDesdeUsuario(credenciales.user);
}

//entra con una cuenta de google (firebase muestra el selector de cuentas)
export async function entrarConGoogleFirebase() {
  const credenciales = await signInWithPopup(obtenerAuth(), new GoogleAuthProvider());
  return sesionDesdeUsuario(credenciales.user);
}

//manda el email con el link para poner una contraseña nueva
//firebase se encarga del mail con su plantilla por defecto (no hay que configurar nada)
export async function pedirRecuperacionFirebase(email) {
  await sendPasswordResetEmail(obtenerAuth(), email);
}

//revisa el link que llega por email: sirve para saber a que email pertenece
//y si el link sigue siendo valido antes de mostrar el formulario de la clave nueva
export async function verificarLinkRecuperacionFirebase(oobCode) {
  const info = await checkActionCode(obtenerAuth(), oobCode);
  return { email: info.data.email ?? '' };
}

//confirma la contraseña nueva con el codigo que viene en el link del email
export async function confirmarClaveNuevaFirebase(oobCode, claveNueva) {
  await confirmPasswordReset(obtenerAuth(), oobCode, claveNueva);
}

//--- recuperacion por sms ---
//firebase puede mandar un codigo a un numero, pero solo si el proyecto tiene:
//  - la cuenta de firebase con plan de pago (blaze) activado
//  - un proveedor de sms dado de alta (twilio) desde la consola de firebase
//sin eso, firebase responde "auth/operation-not-allowed" y el metodo no se puede usar
//el backend informa si hay proveedor cargado (ver /api/usuarios/dueno/metodos-recuperacion)
export async function pedirCodigoSmsFirebase(telefono, contenedorId) {
  //el recaptcha invisible de firebase necesita un contenedor en el dom para anclarse
  const verificador = new RecaptchaVerifier(obtenerAuth(), contenedorId, { size: 'invisible' });
  await verificador.render();
  const confirmacion = await obtenerAuth().signInWithPhoneNumber(telefono, verificador);
  return confirmacion.confirmationResult;
}

//confirma el codigo recibido por sms y deja puesta la contraseña nueva
export async function confirmarClaveConCodigoSmsFirebase(confirmacion, codigo, claveNueva) {
  const usuario = await confirmacion.confirm(String(codigo).trim());
  await usuario.updatePassword(claveNueva);
}

//cambia el nombre de usuario (displayName) en firebase y devuelve la sesion actualizada
//se pide un token fresco para que el backend lea el nombre nuevo en los comentarios
//espera a que firebase termine de restaurar la sesion: recien ahi existe auth.currentUser
export async function actualizarNombreFirebase(nombre) {
  const usuario = await usuarioFirebaseActual();
  if (!usuario) {
    throw new Error('No hay una sesión activa. Volvé a entrar con tu cuenta.');
  }
  await updateProfile(usuario, { displayName: String(nombre).trim() });
  const token = await usuario.getIdToken(true);
  return {
    token,
    nombre:
      usuario.displayName ||
      (usuario.email ? usuario.email.split('@')[0] : 'Visitante'),
    email: usuario.email,
    foto: usuario.photoURL || '',
  };
}

//el token de firebase dura una hora: si el navegador quedo mucho tiempo abierto (o la sesion es vieja),
//el guardado en el localstorage ya vencio y la api responde 401
//espera a que firebase termine de leer la sesion guardada en el navegador y devuelve el usuario
export function usuarioFirebaseActual() {
  return new Promise((resolver) => {
    if (!firebaseConfigurado) return resolver(null);
    try {
      const auth = obtenerAuth();
      const desuscribir = onIdTokenChanged(auth, (usuario) => {
        desuscribir();
        resolver(usuario ?? null);
      });
      //si no responde rapido, se corta para no dejar la interfaz esperando
      setTimeout(() => {
        desuscribir();
        resolver(auth.currentUser);
      }, 3000);
    } catch {
      resolver(null);
    }
  });
}

//devuelve el token siempre fresco (o null si no hay sesion de firebase)
export async function tokenActual() {
  const usuario = await usuarioFirebaseActual();
  if (!usuario) return null;
  return usuario.getIdToken().catch(() => null);
}

//cierra la sesion de firebase en este navegador
//se usa al cambiar de cuenta y al eliminar la cuenta
export async function cerrarSesionFirebase() {
  if (!firebaseConfigurado) return;
  try {
    await signOut(obtenerAuth());
  } catch {
    //si ya no habia sesion en firebase, no hay nada que hacer
  }
}

//codigo del error de firebase cuando el email ya tiene una cuenta
export const ERROR_CUENTA_EXISTE = 'auth/email-already-in-use';

//traduce los errores de firebase a mensajes claros para el usuario
export function traducirErrorFirebase(error) {
  const mensajes = {
    [ERROR_CUENTA_EXISTE]: 'Ya existe un usuario con esa cuenta.',
    'auth/invalid-email': 'Ingresá un email válido.',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
    'auth/user-not-found': 'Esta cuenta no pertenece a ningún usuario registrado.',
    'auth/missing-email': 'Escribí el email con el que te registraste.',
    'auth/invalid-action-code': 'El link ya venció o ya fue usado. Pedí uno nuevo.',
    'auth/expired-action-code': 'El link ya venció. Pedí uno nuevo.',
    'auth/wrong-password': 'Email o contraseña incorrectos.',
    'auth/invalid-credential': 'Email o contraseña incorrectos.',
    'auth/too-many-requests': 'Demasiados intentos. Probá de nuevo en unos minutos.',
    'auth/popup-closed-by-user': 'Cancelaste el acceso con Google.',
    'auth/cancelled-popup-request': 'Cancelaste el acceso con Google.',
    'auth/network-request-failed': 'No hay conexión. Probá de nuevo.',
    'auth/user-disabled': 'Esta cuenta fue deshabilitada.',
  };
  return (
    mensajes[error?.code] ??
    error?.message ??
    'No se pudo completar la operación. Probá de nuevo.'
  );
}