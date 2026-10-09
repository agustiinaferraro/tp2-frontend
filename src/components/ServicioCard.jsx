//tarjeta de un servicio: muestra la portada de un proyecto del mismo rubro, el icono y los datos
//la portada se elige sola (un proyecto destacado del servicio), no se carga a mano
//la portada va sola, sin el nombre del proyecto ni el sitio encima: solo la imagen
//se reusa en la grilla de servicios
import IconoServicio from './IconoServicio.jsx';
import ImagenProyecto from './ImagenProyecto.jsx';

export default function ServicioCard({ servicio, proyecto = null }) {
  return (
    <a
      href={`/servicios/${servicio.slug ?? servicio._id}`}
      className="block h-full group relative"
    >
      <article className="h-full rounded-2xl border border-verde-app/30 group-hover:border-verde-app/90 group-hover:scale-[1.03] active:scale-95 shadow-lg shadow-black/50 group-hover:shadow-verde-app/25 transition-all duration-300 flex flex-col overflow-hidden relative z-0 hover:z-10 focus-within:z-10 bg-zinc-950">
        
        {/* Resplandor ambiental de fondo (Glow Effect) en Hover */}
        <div className="absolute -inset-1 bg-gradient-to-r from-verde-app/0 via-verde-app/20 to-verde-app/0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl pointer-events-none" />

        {/* Portada o Fallback cuando NO hay imagen de proyecto (ej. Programación) */}
        <figure className="m-0 absolute inset-0 w-full h-full overflow-hidden bg-zinc-900 z-0">
          {proyecto ? (
            <ImagenProyecto
              proyecto={proyecto}
              alternativa={false}
              className="w-full h-full object-cover group-hover:scale-110 group-hover:opacity-50 opacity-30 transition-all duration-500 ease-out"
            />
          ) : (
            /* Fondo abstracto con trama tecnológica para servicios sin imagen */
            <div className="w-full h-full bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px] opacity-15 group-hover:opacity-30 group-hover:scale-105 transition-all duration-500" />
          )}
        </figure>

        {/* Overlays de lectura: degradado superior e inferior */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/85 to-zinc-950/60 group-hover:via-zinc-950/75 transition-colors duration-300 pointer-events-none z-10" />

        {/* Contenido principal */}
        <div className="p-5 flex flex-col flex-1 relative z-20 justify-between">
          <div>
            {/* Cabecera de la card: Ícono + Chip identificador para saber de qué es la tarjeta */}
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-black/60 backdrop-blur-md border border-verde-app/50 text-verde-app group-hover:border-verde-app group-hover:scale-110 group-hover:bg-verde-app group-hover:text-black transition-all duration-300 shadow-md">
                <IconoServicio slug={servicio.slug ?? servicio._id} className="w-5 h-5" />
              </span>

              {/* Tag aclaratorio del servicio */}
              <span className="text-[11px] uppercase tracking-wider font-semibold text-verde-app/90 bg-verde-app/10 border border-verde-app/30 px-2.5 py-0.5 rounded-full backdrop-blur-sm group-hover:bg-verde-app/20 transition-all">
                Servicio
              </span>
            </div>

            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-verde-app transition-colors duration-200 tracking-tight">
              {servicio.nombre}
            </h3>

            {/*la descripcion se limita a 3 lineas: asi todas las cards quedan con el mismo alto*/}
            <p className="text-zinc-300 text-sm leading-relaxed line-clamp-3 flex-1 font-light">
              {servicio.descripcion}
            </p>
          </div>

          <p className="mt-4 pt-2 border-t border-white/5">
            <span className="inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-verde-app group-hover:text-white transition-all duration-200">
              Ver detalles 
              <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1.5 text-verde-app">→</span>
            </span>
          </p>
        </div>
      </article>
    </a>
  );
}