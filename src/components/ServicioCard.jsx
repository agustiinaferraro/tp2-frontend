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
      className="block h-full group"
    >
      <article className="h-full rounded-2xl bg-white/10 group-hover:bg-white/20 backdrop-blur-md border border-verde-app/40 group-hover:border-verde-app/70 group-hover:scale-[1.03] active:scale-95 shadow-lg shadow-verde-app/10 transition-all duration-200 flex flex-col overflow-hidden relative z-0 hover:z-10 focus-within:z-10">
        {/*portada: solo la imagen de un proyecto real del mismo rubro (foto propia o captura del deploy)*/}
        <figure className="m-0 relative overflow-hidden bg-zinc-900 h-20">
          {proyecto && (
            <ImagenProyecto
              proyecto={proyecto}
              alternativa={false}
              className="w-full h-20 object-cover group-hover:opacity-80 transition-opacity duration-300"
            />
          )}
        </figure>
        <div className="p-3.5 flex flex-col flex-1">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-white/10 border border-verde-app/40 text-verde-app mb-2">
            <IconoServicio slug={servicio.slug ?? servicio._id} className="w-4 h-4" />
          </span>
          <h3 className="text-base font-bold text-white mb-1">{servicio.nombre}</h3>
          {/*la descripcion se limita a 3 lineas: asi todas las cards quedan con el mismo alto*/}
          <p className="text-zinc-400 text-sm leading-relaxed line-clamp-3 flex-1">
            {servicio.descripcion}
          </p>
          <p className="mt-2">
            <span className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-verde-app group-hover:text-verde-app/80 hover:scale-105 active:scale-95 transition-all duration-200">
              Ver más <span aria-hidden="true">→</span>
            </span>
          </p>
        </div>
      </article>
    </a>
  );
}