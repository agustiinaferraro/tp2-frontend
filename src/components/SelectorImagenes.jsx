//selector de varias imagenes para un proyecto: se usa en el panel admin y en el detalle al editar
//la primera imagen actua como portada y el resto como galeria del detalle
//las imagenes se comprimen en el navegador antes de guardarse en la base
import { useState } from 'react';
import { comprimirImagen } from '../utils/imagen.js';

//presupuesto total de la galeria en base64 para que el guardado no falle en vercel
const PRESUPUESTO_TOTAL = 1.4 * 1024 * 1024;
const MAX_POR_IMAGEN = 8 * 1024 * 1024;

export default function SelectorImagenes({ imagenes, alCambiar, mostrarMensaje }) {
  const [comprimiendo, setComprimiendo] = useState(false);

  async function alElegirArchivos(evento) {
    const archivos = [...(evento.target.files ?? [])];
    if (archivos.length === 0) return;
    evento.target.value = '';
    setComprimiendo(true);
    const nuevas = [...imagenes];
    for (const archivo of archivos) {
      if (archivo.size > MAX_POR_IMAGEN) {
        mostrarMensaje(`La imagen "${archivo.name}" pesa más de 8 MB. Probá con otra.`, 'error');
        continue;
      }
      try {
        const base64 = await comprimirImagen(archivo);
        const total = nuevas.reduce((suma, img) => suma + img.length, 0);
        if (total + base64.length > PRESUPUESTO_TOTAL) {
          mostrarMensaje('Las imágenes ocupan demasiado espacio en total. Quitá alguna o usá versiones más livianas.', 'error');
          continue;
        }
        nuevas.push(base64);
      } catch (error) {
        mostrarMensaje(error.message, 'error');
      }
    }
    setComprimiendo(false);
    if (nuevas.length !== imagenes.length) alCambiar(nuevas);
  }

  function quitar(indice) {
    alCambiar(imagenes.filter((_, i) => i !== indice));
  }

  return (
    <div className="space-y-3">
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={alElegirArchivos}
        disabled={comprimiendo}
        className="block w-full text-sm text-transparent file:mr-4 file:px-4 file:py-2 file:rounded-lg file:border-0 file:bg-violeta-app file:text-black file:font-medium file:cursor-pointer hover:file:bg-violeta-app/90 file:transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      />
      <p className="text-xs text-zinc-600">
        Podés elegir varias a la vez. Cada una se comprime sola. La primera es la portada y el resto se ven en el detalle.
      </p>

      {comprimiendo && <p className="text-xs text-zinc-500">Procesando imágenes...</p>}

      {imagenes.length > 0 && (
        <ul className="flex flex-wrap gap-3">
          {imagenes.map((img, indice) => (
            <li key={indice} className="w-24">
              <div className="relative">
                <img
                  src={img}
                  alt={`Imagen ${indice + 1} del proyecto`}
                  className="h-24 w-24 object-cover rounded-lg border border-zinc-700 bg-black"
                />
                {indice === 0 && (
                  <span className="absolute bottom-1 left-1 text-[10px] px-1.5 py-0.5 rounded bg-verde-app text-black">
                    Portada
                  </span>
                )}
              </div>
              {/*tacho blanco debajo de la imagen para quitarla (no tapa la imagen)*/}
              <button
                type="button"
                onClick={() => quitar(indice)}
                aria-label={`Eliminar imagen ${indice + 1}`}
                title={`Eliminar imagen ${indice + 1}`}
                className="mt-1 w-full flex items-center justify-center py-1.5 rounded-lg text-zinc-200 hover:text-red-400 hover:bg-zinc-800 active:scale-95 transition-all cursor-pointer"
              >
                <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}