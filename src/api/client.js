//capa de datos: client base para llamar a la api del backend
//el frontend consulta la api desde aca, no desde los componentes

//url base del backend. se configura con public_api_url o usa localhost en desarrollo
export const API_BASE = import.meta.env.PUBLIC_API_URL ?? 'http://localhost:4000';

//funcion generica que hace una peticion a la api y devuelve los datos en json
//si la respuesta no es correcta, lanza un error explicando que paso
export async function peticionGET(ruta) {
  const respuesta = await fetch(`${API_BASE}${ruta}`);
  if (!respuesta.ok) {
    throw new Error(`Error al consultar ${ruta}: ${respuesta.status}`);
  }
  return respuesta.json();
}

//funcion generica de get con sesion de usuario: manda el token de firebase en el header
//para las rutas que exigen estar logueado (ej. leer la propia conversacion de contacto)
export async function peticionGETAutenticada(ruta, token) {
  const respuesta = await fetch(`${API_BASE}${ruta}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!respuesta.ok) {
    const cuerpo = await respuesta.json().catch(() => null);
    throw new Error(cuerpo?.mensaje ?? `Error al consultar ${ruta}: ${respuesta.status}`);
  }
  return respuesta.json();
}

//funcion generica para enviar datos a la api (post)
//convierte el objeto a json y lo manda en el body de la peticion
export async function peticionPOST(ruta, datos) {
  const respuesta = await fetch(`${API_BASE}${ruta}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  });
  if (!respuesta.ok) {
    //se aprovecha el mensaje del servidor (y datos extra como que campo fallo)
    const cuerpo = await respuesta.json().catch(() => null);
    const error = new Error(cuerpo?.mensaje ?? `Error al enviar a ${ruta}: ${respuesta.status}`);
    error.campos = cuerpo;
    throw error;
  }
  return respuesta.json();
}

//funcion generica para enviar datos a la api como usuario logueado (post)
//manda el token de sesion en el header authorization para que el backend valide
export async function peticionConToken(ruta, datos, token) {
  const respuesta = await fetch(`${API_BASE}${ruta}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(datos),
  });
  if (!respuesta.ok) {
    const cuerpo = await respuesta.json().catch(() => null);
    const error = new Error(cuerpo?.mensaje ?? `Error al enviar a ${ruta}: ${respuesta.status}`);
    error.campos = cuerpo;
    throw error;
  }
  return respuesta.json();
}

//funcion generica para borrar algo de la api con la sesion del usuario (delete)
//manda el token en el header authorization para que el backend valide
export async function peticionDELETE(ruta, token) {
  const respuesta = await fetch(`${API_BASE}${ruta}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!respuesta.ok) {
    const cuerpo = await respuesta.json().catch(() => null);
    throw new Error(cuerpo?.mensaje ?? `Error al borrar ${ruta}: ${respuesta.status}`);
  }
  return respuesta.json();
}

//funcion generica para modificar datos del panel de admin (post, put o delete)
//manda la clave de administrador en el header x-admin-clave para que el backend valide
//si no se pasa clave, la dueña entra con su cuenta de "mi cuenta" y se usa su token de firebase
export async function peticionAdmin(metodo, ruta, datos, clave) {
  const cabeceras = { 'Content-Type': 'application/json' };
  if (clave) {
    cabeceras['x-admin-clave'] = clave;
  } else {
    try {
      const sesion = JSON.parse(localStorage.getItem('sesion-usuario') ?? 'null');
      if (sesion?.token) cabeceras.Authorization = `Bearer ${sesion.token}`;
    } catch {}
  }
  const respuesta = await fetch(`${API_BASE}${ruta}`, {
    method: metodo,
    headers: cabeceras,
    body: datos ? JSON.stringify(datos) : undefined,
  });
  if (!respuesta.ok) {
    throw new Error(`Error en ${metodo} ${ruta}: ${respuesta.status}`);
  }
  return respuesta.json();
}