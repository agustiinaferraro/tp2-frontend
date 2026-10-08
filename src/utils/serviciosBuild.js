//trae la lista de servicios desde el backend para generar las paginas en el build.
//si la api no responde, usa el respaldo local para que el build no falle.
import { serviciosRespaldo } from '../data/servicios-respaldo.js';

const API_BASE = import.meta.env.PUBLIC_API_URL ?? 'http://localhost:4000';

//se cachea la promesa para pedir la lista una sola vez en todo el build
let promesaServicios;

export function obtenerServiciosParaBuild() {
  if (!promesaServicios) {
    promesaServicios = (async () => {
      try {
        const respuesta = await fetch(`${API_BASE}/api/servicios`);
        if (respuesta.ok) {
          const lista = await respuesta.json();
          if (Array.isArray(lista) && lista.length) return lista;
        }
        console.warn('No se pudieron obtener los servicios de la api; se usa el respaldo local.');
      } catch (error) {
        console.warn(`No se pudo conectar a la api; se usa el respaldo local. ${error.message}`);
      }
      return serviciosRespaldo;
    })();
  }
  return promesaServicios;
}