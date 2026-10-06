//detalle de un servicio: pagina dinamica por slug
//trae el contenido desde la api y los proyectos de esa categoria
import { useEffect, useState } from 'react';
import { obtenerServicioPorSlug } from '../api/servicios.js';
import { obtenerProyectosPorServicio } from '../api/proyectos.js';
import IconoServicio from './IconoServicio.jsx';
import ImagenProyecto from './ImagenProyecto.jsx';
import Loading from './Loading.jsx';
import { textoVisitar } from '../utils/proyectos.js';

//prop "mostrarTitulo": si la pagina ya muestra el nombre en la portada de arriba, se omite aqui
export default function ServicioDetalle({ slug, mostrarTitulo = true }) {
  const [servicio, setServicio] = useState(null);
  const [proyectos, setProyectos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  //se pide el servicio y sus proyectos cada vez que cambia el slug
  useEffect(() => {
    setCargando(true);
    setError(null);
    setProyectos([]);
    obtenerServicioPorSlug(slug)
      .then((datos) => {
        setServicio(datos);
        return obtenerProyectosPorServicio(slug);
      })
      .then(setProyectos)
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  }, [slug]);

  //estado: error
  if (error) {
    return (
      <section className="max-w-3xl mx-auto px-4 py-24 text-center">
        <p role="alert" className="text-red-400">
          No se pudo cargar el servicio. Verificá que el backend esté corriendo.
        </p>
      </section>
    );
  }

  //estado: cargando
  if (cargando) {
    return (
      <section className="max-w-3xl mx-auto px-4 py-24">
        <Loading claseContenedor="h-48" />
      </section>
    );
  }

  //estado: sin datos
  if (!servicio) {
    return (
      <section className="max-w-3xl mx-auto px-4 py-24 text-center">
        <p className="text-zinc-400">No encontramos ese servicio.</p>
      </section>
    );
  }

  //estado: con datos
  return (
    <section className="max-w-5xl mx-auto px-4 py-16">
      <span className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-verde-app/10 border border-verde-app/20 text-verde-app mb-6">
        <IconoServicio slug={servicio.slug} className="w-8 h-8" />
      </span>
      {mostrarTitulo && (
        <>
          <p className="text-verde-app font-medium tracking-widest uppercase text-sm">Servicio</p>
          <h1 className="text-4xl font-bold text-white mt-2">{servicio.nombre}</h1>
        </>
      )}
      <p className="text-lg text-zinc-400 leading-relaxed mt-6">{servicio.descripcion}</p>

      {/*proyectos que entran en esta categoria*/}
      {proyectos.length > 0 && (
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-white">Proyectos de {servicio.nombre}</h2>
          <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {proyectos.map((proyecto) => (
              <li key={proyecto._id}>
                <article className="h-full flex flex-col overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-verde-app/50 transition-colors">
                  {/*la portada es la imagen que mejor representa al proyecto
                    (la de behance, o la captura del deploy en los proyectos web)*/}
                  {(proyecto.imagen || proyecto.imagenes?.[0] || proyecto.link) && (
                    <figure className="m-0 overflow-hidden bg-zinc-800">
                      <a href={`/proyectos/?id=${proyecto._id}`}>
                        <ImagenProyecto
                          proyecto={proyecto}
                          alternativa={false}
                          className="w-full h-40 object-cover hover:opacity-90 transition-opacity"
                        />
                      </a>
                    </figure>
                  )}
                  <div className="p-6 flex flex-col gap-3 flex-1">
                    <h3 className="text-xl font-bold text-white">
                      <a href={`/proyectos/?id=${proyecto._id}`} className="rounded-lg px-2 py-1 hover:bg-verde-app/10 hover:text-verde-app/80 active:scale-95 hover:scale-105 transition-all duration-200">
                        {proyecto.titulo}
                      </a>
                    </h3>
                    <p className="text-zinc-400 text-sm leading-relaxed flex-1">{proyecto.resumen}</p>
                    {proyecto.link && (
                      <p className="mt-auto">
                        <a
                          href={proyecto.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-verde-app hover:bg-verde-app/10 hover:text-verde-app/80 active:scale-95 hover:scale-105 transition-all duration-200"
                        >
                          {textoVisitar(proyecto)} <span aria-hidden="true">→</span>
                        </a>
                      </p>
                    )}
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}