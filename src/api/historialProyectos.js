import { peticionAdmin, API_BASE } from './client.js';

export async function obtenerHistorialProyectos() {
  return peticionAdmin('GET', '/api/historial-proyectos');
}

export async function restaurarHistorialProyecto(id) {
  const token = await (await import('./firebase.js')).tokenActual();
  const r = await fetch(`${API_BASE}/api/historial-proyectos/restaurar/${id}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if(!r.ok){ throw new Error((await r.json()).mensaje || 'Error al restaurar'); }
  return await r.json();
}
