//certificaciones: carrusel horizontal de imagenes con zoom
//al tocar una se abre en grande, con cruz para cerrar y se cierra tambien tocando afuera
import { useEffect, useState } from 'react';
import Carrusel from './Carrusel.jsx';

//las certificaciones llegan por props (desde el backend, via la pagina sobre-mi)

function Cruz() {
  return (
    <svg aria-hidden="true" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function Flecha({ direccion }) {
  return (
    <svg
      aria-hidden="true"
      className="w-6 h-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {direccion === 'izquierda' ? <path d="m15 18-6-6 6-6" /> : <path d="m9 18 6-6-6-6" />}
    </svg>
  );
}

function Check({ className = '' }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export default function Certificaciones({ certificaciones = [] }) {
  //indice del certificado abierto en el visor (null = cerrado)
  const [abierta, setAbierta] = useState(null);
  const total = certificaciones.length;
  const certAbierta = abierta == null ? null : certificaciones[abierta];

  //con el visor abierto: Escape cierra y las flechas del teclado pasan de certificado
  useEffect(() => {
    if (abierta == null) return undefined;
    const alPresionar = (e) => {
      if (e.key === 'Escape') setAbierta(null);
      else if (e.key === 'ArrowLeft') setAbierta((i) => (i - 1 + total) % total);
      else if (e.key === 'ArrowRight') setAbierta((i) => (i + 1) % total);
    };
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, [abierta, total]);

  return (
    <>
      <div className="px-4 pb-16 max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-white text-left inline-flex items-center gap-3 mb-8">
          <svg
            aria-hidden="true"
            className="w-8 h-8 text-violeta-app"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            viewBox="0 0 24 24"
          >
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
            <path d="M6 12v5c3 3 9 3 12 0v-5" />
          </svg>
          Certificaciones
        </h2>

        <Carrusel etiqueta="Certificaciones" clave="certificaciones">
          {certificaciones.map((cert, indice) => (
            <li
              key={cert.nombre}
              className="shrink-0 snap-start w-[clamp(15rem,72%,20rem)] h-full"
            >
              <div className="h-full rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden transition-all duration-200 hover:border-violeta-app/50 hover:scale-105 hover:-translate-y-1 relative z-0 hover:z-10 focus-within:z-10">
                <button
                  type="button"
                  onClick={() => setAbierta(indice)}
                  className="block w-full h-full text-left cursor-pointer"
                >
                  <img
                    src={cert.imagen}
                    alt={cert.nombre}
                    loading="lazy"
                    className="w-full h-64 object-cover object-top bg-zinc-800"
                  />
                  <p className="flex items-start gap-2 px-4 py-4 text-white text-sm font-semibold">
                    <Check className="w-5 h-5 text-verde-app shrink-0 mt-0.5" />
                    {cert.descripcion}
                  </p>
                </button>
              </div>
            </li>
          ))}
        </Carrusel>
      </div>

      {/*la imagen abierta encima de todo, con fondo oscuro*/}
      {certAbierta && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={certAbierta.nombre}
          onClick={(e) => {
            //solo se cierra tocando el fondo: los clics en la foto, el texto o las flechas no
            if (e.target === e.currentTarget) setAbierta(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 overflow-y-auto animacion-aparecer"
        >
          {/*cruz para cerrar*/}
          <button
            type="button"
            onClick={() => setAbierta(null)}
            aria-label="Cerrar"
            className="fixed top-4 right-4 z-10 flex items-center justify-center w-12 h-12 rounded-full bg-zinc-900 border border-zinc-700 text-white transition-all duration-200 cursor-pointer hover:scale-110 hover:bg-verde-app hover:text-black hover:border-verde-app active:scale-90"
          >
            <Cruz />
          </button>

          {/*flecha al certificado anterior*/}
          {total > 1 && (
            <button
              type="button"
              onClick={() => setAbierta((i) => (i - 1 + total) % total)}
              aria-label="Certificado anterior"
              className="fixed left-2 sm:left-4 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-12 h-12 rounded-full bg-zinc-900/90 border border-zinc-700 text-white transition-all duration-200 cursor-pointer hover:scale-110 hover:bg-verde-app hover:text-black hover:border-verde-app active:scale-90"
            >
              <Flecha direccion="izquierda" />
            </button>
          )}

          {/*flecha al certificado siguiente*/}
          {total > 1 && (
            <button
              type="button"
              onClick={() => setAbierta((i) => (i + 1) % total)}
              aria-label="Certificado siguiente"
              className="fixed right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-12 h-12 rounded-full bg-zinc-900/90 border border-zinc-700 text-white transition-all duration-200 cursor-pointer hover:scale-110 hover:bg-verde-app hover:text-black hover:border-verde-app active:scale-90"
            >
              <Flecha direccion="derecha" />
            </button>
          )}

          <div className="max-w-3xl w-full">
            <h3 className="text-2xl font-bold text-white text-center mb-1">{certAbierta.nombre}</h3>
            <p className="text-sm text-zinc-400 text-center mb-4">{certAbierta.descripcion}</p>
            <img
              src={certAbierta.imagen}
              alt={certAbierta.descripcion}
              className="w-full max-h-[75vh] object-contain rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl"
            />
            {total > 1 && (
              <p className="text-center text-xs text-zinc-400 mt-3">
                {abierta + 1} / {total}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
