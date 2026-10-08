//certificaciones: carrusel horizontal de imagenes con zoom
//al tocar una se abre en grande, con cruz para cerrar y se cierra tambien tocando afuera
import { useEffect, useState } from 'react';
import Carrusel from './Carrusel.jsx';

//las certificaciones llegan por props (desde el backend, via la pagina sobre-mi)

function Cruz() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
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
  const [abierta, setAbierta] = useState(null);

  // Escape tambien cierra
  useEffect(() => {
    if (!abierta) return undefined;
    const alPresionar = (e) => {
      if (e.key === 'Escape') setAbierta(null);
    };
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, [abierta]);

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
          {certificaciones.map((cert) => (
            <li
              key={cert.nombre}
              className="shrink-0 snap-start w-[clamp(15rem,72%,20rem)] h-full"
            >
              <div className="h-full rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden transition-all duration-200 hover:border-violeta-app/50 hover:scale-105 hover:-translate-y-1 relative z-0 hover:z-10 focus-within:z-10">
                <button
                  type="button"
                  onClick={() => setAbierta(cert)}
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
      {abierta && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={abierta.nombre}
          onClick={() => setAbierta(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 overflow-y-auto animacion-aparecer"
        >
          {/*la cruz va al costado de la card para no tapar la foto*/}
          <button
            type="button"
onClick={(e) => {
            //solo se cierra tocando el fondo: si el clic viene de la foto o del texto no
            if (e.target === e.currentTarget) setAbierta(null);
          }}
            aria-label="Cerrar"
            className="shrink-0 mr-3 self-start mt-2 w-12 h-12 rounded-full bg-zinc-900 border border-zinc-700 text-white transition-all duration-200 cursor-pointer hover:scale-110 hover:bg-verde-app hover:text-black hover:border-verde-app active:scale-90"
          >
            <Cruz />
          </button>

          <div className="max-w-3xl w-full">
            <h3 className="text-2xl font-bold text-white text-center mb-1">{abierta.nombre}</h3>
            <p className="text-sm text-zinc-400 text-center mb-4">{abierta.descripcion}</p>
            <img
              src={abierta.imagen}
              alt={abierta.descripcion}
              className="w-full max-h-[75vh] object-contain rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl"
            />
          </div>
        </div>
      )}
    </>
  );
}
