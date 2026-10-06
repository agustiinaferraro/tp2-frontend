//tarjeta de un proyecto en el carrusel del panel admin: imagen, titulo, categoria y botones editar/borrar
//toda la card es clickeable: abre la edicion del proyecto (los botones hacen su propia accion)
function IconoLapiz({ className }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

function IconoTacho({ className }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

export default function AdminProyectoCard({ proyecto, grupoNombre, alEditar, alEliminar }) {
  const tieneImagen = !!(proyecto.imagen || proyecto.imagenes?.[0]);
  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`Editar ${proyecto.titulo}`}
      onClick={() => alEditar(proyecto)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          alEditar(proyecto);
        }
      }}
      className="group relative rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 focus-within:ring-2 focus-within:ring-verde-app cursor-pointer hover:scale-105 active:scale-95 transition-all duration-200"
    >
      {tieneImagen ? (
        <img
          src={proyecto.imagen || proyecto.imagenes[0]}
          alt=""
          className="w-full aspect-[4/3] object-cover"
        />
      ) : (
        <div className="w-full aspect-[4/3] bg-zinc-800 flex items-center justify-center text-zinc-600 text-xs">
          Sin portada
        </div>
      )}
      <div className="p-3">
        <p className="text-sm font-medium text-white truncate">{proyecto.titulo}</p>
        <p className="text-xs text-verde-app truncate">{grupoNombre}</p>
      </div>
      <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            alEditar(proyecto);
          }}
          aria-label={`Editar ${proyecto.titulo}`}
          title="Editar"
          className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-zinc-900/90 text-verde-app hover:text-black hover:bg-verde-app hover:scale-110 active:scale-90 transition-all duration-200 cursor-pointer"
        >
          <IconoLapiz className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            alEliminar(proyecto);
          }}
          aria-label={`Eliminar ${proyecto.titulo}`}
          title="Eliminar"
          className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-zinc-900/90 text-red-400 hover:text-white hover:bg-red-600 hover:scale-110 active:scale-90 transition-all duration-200 cursor-pointer"
        >
          <IconoTacho className="w-4 h-4" />
        </button>
      </div>
    </article>
  );
}