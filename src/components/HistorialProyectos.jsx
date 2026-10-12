import { useEffect, useState } from 'react';
import { obtenerHistorialProyectos, restaurarHistorialProyecto } from '../servicios/historialProyectos.js';

export default function HistorialProyectos({ alRestaurar }) {
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const [restaurando, setRestaurando] = useState(null);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const data = await obtenerHistorialProyectos();
      setItems(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  async function restaurar(id) {
    setRestaurando(id);
    setError(null);
    setMensaje(null);
    try {
      const r = await restaurarHistorialProyecto(id);
      setMensaje(r.mensaje ?? 'Proyecto restaurado');
      alRestaurar?.();
      await cargar();
    } catch (e) {
      setError(e.message);
    } finally {
      setRestaurando(null);
    }
  }

  if (cargando) return <p className="text-zinc-400 text-sm">Cargando historial...</p>;

  return (
    <div className="space-y-2">
      {mensaje && <p className="text-sm text-verde-app">{mensaje}</p>}
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {items.length === 0 && !error && (
        <p className="text-zinc-400 text-sm">No hay historial</p>
      )}
      {items.map((h) => (
        <div key={h._id} className="flex items-center justify-between p-2 rounded bg-zinc-900 border border-zinc-800">
          <div className="text-sm">
            <span className="text-zinc-300">{h.tipo} - {h.titulo}</span>
            <span className="text-zinc-500 ml-2">{new Date(h.createdAt).toLocaleString()}</span>
            {h.restaurado && (
              <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-zinc-800 text-verde-app border border-zinc-700">
                Restaurado
              </span>
            )}
          </div>
          {h.tipo === 'eliminar' && !h.restaurado && (
            <button
              type="button"
              onClick={() => restaurar(h._id)}
              disabled={restaurando === h._id}
              className="text-xs px-2 py-1 rounded bg-verde-app text-black disabled:opacity-60"
            >
              {restaurando === h._id ? 'Restaurando...' : 'Restaurar'}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
