// tarjeta de un proyecto: casi toda la card es clickeable
// todas las cards (incluidas las de behance) abren el detalle del sitio: ahi se ve la imagen
// que se subio a behance y el boton para visitar el proyecto publicado.
// el link externo nunca va dentro del principal (html no anida links), va aparte al pie de la card
// se reusa en los carruseles y en la grilla de proyectos
// titulo y resumen se acotan con line-clamp (2 y 3 lineas): asi el recorte se adapta al ancho
// de la tarjeta y todas las tarjetas quedan con la misma altura. el texto completo se ve en el detalle
import ImagenProyecto from './ImagenProyecto.jsx';
import { textoVisitar } from '../utils/proyectos.js';

export default function ProyectoCard({ proyecto, destacado = false }) {
  const claseEnlacePrincipal = 'flex flex-col';
  //los destacados del carrusel de la home llevan un borde naranja para que se distingan de una vez
  const claseBorde = destacado
    ? 'border-orange-400/70 ring-2 ring-orange-400/25 hover:border-orange-400'
    : 'border-zinc-800 hover:border-verde-app/50';

  return (
    <article
      className={`group relative z-0 hover:z-10 focus-within:z-10 flex flex-col overflow-hidden rounded-2xl bg-zinc-900 border hover:scale-105 active:scale-95 transition-all duration-200 ${claseBorde}`}
    >
      {/* link principal: siempre al detalle del proyecto en el sitio */}
      <a href={`/proyectos/?id=${proyecto._id}`} className={claseEnlacePrincipal}>
        {/* portada: la imagen que mejor representa al proyecto
            (de behance es la que se subio alla; de desarrollo, la captura del deploy) */}
        {(proyecto.imagen || proyecto.imagenes?.[0] || proyecto.link) && (
          <figure className="m-0 overflow-hidden bg-zinc-800">
            <ImagenProyecto
              proyecto={proyecto}
              alternativa={false}
              className="w-full h-24 object-cover group-hover:opacity-90 transition-opacity"
            />
          </figure>
        )}
        <div className="p-3 flex flex-col gap-1.5">
          <h3
            className={`text-base font-bold text-white line-clamp-2 shrink-0 transition-colors ${
              destacado ? 'group-hover:text-orange-300' : 'group-hover:text-verde-app/80'
            }`}
          >
            {proyecto.titulo}
          </h3>
          {destacado && (
            <span className="inline-flex w-fit items-center gap-1 rounded-full bg-orange-400/15 px-2 py-1 text-xs font-medium text-orange-300 border border-orange-400/40">
              <svg aria-hidden="true" className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m12 3 2.6 5.6 6.1.8-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.4l6.1-.8z"
                />
              </svg>
              Destacado
            </span>
          )}
          {/* tags / roles aplicados */}
          {proyecto.tags?.length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label="Etiquetas del proyecto">
              {proyecto.tags.map((tag) => (
                <li
                  key={tag}
                  className="text-xs px-2 py-1 rounded-full bg-verde-app/10 text-verde-app border border-verde-app/20"
                >
                  {tag}
                </li>
              ))}
            </ul>
          )}
          {/* el resumen se limita a 3 lineas con line-clamp. lleva shrink-0 porque, sin eso, el
              flexbox de la card lo aplasta para que entre todo y el texto se corta a la
              mitad de una linea, sin los puntos suspensivos */}
          <p className="text-zinc-400 text-sm leading-relaxed line-clamp-3 shrink-0">
            {proyecto.resumen}
          </p>
        </div>
      </a>
      {/* link externo del proyecto: va al sitio publicado (behance, vercel, etc) */}
      {proyecto.link && (
        <p className="px-3 pb-3">
          <a
            href={proyecto.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-verde-app hover:bg-verde-app/10 hover:text-verde-app/80 active:scale-95 hover:scale-105 transition-all duration-200"
          >
            {textoVisitar(proyecto)} <span aria-hidden="true">↗</span>
          </a>
        </p>
      )}
    </article>
  );
}
