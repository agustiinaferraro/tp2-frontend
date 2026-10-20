//detalle de un proyecto (estilo behance): muestra todo el proyecto en grande
//la edicion no vive aca: el panel (/admin) es el unico lugar donde se cargan y cambian los proyectos
import { useEffect, useState } from 'react';
import { obtenerProyectoPorId } from '../api/proyectos.js';
import { obtenerServicios } from '../api/servicios.js';
import Loading from './Loading.jsx';
import Comentarios from './Comentarios.jsx';
import { galeriaProyecto, textoVisitar, esDespliegue, imagenPreferida } from '../utils/proyectos.js';
import { urlVideoCcV } from '../api/behance.js';
import { ordenarAnimacionPrimero } from '../utils/ordenCategorias.js';

//categorias conocidas (las que tienen paginas generadas en el build)
//las nuevas no tienen pagina pero si se muestran como chip
function esCategoriaConocida(listaServicios, slug) {
  return listaServicios.some((s) => s.slug === slug);
}

//categorias de un proyecto: la lista nueva ("servicios") o la vieja ("servicio")
function categoriasDeProyecto(proyecto) {
  const lista = Array.isArray(proyecto.servicios) && proyecto.servicios.length
    ? proyecto.servicios
    : proyecto.servicio
      ? [proyecto.servicio]
      : [];
  return [...new Set(lista.map((s) => String(s).trim()).filter(Boolean))];
}

export default function ProyectoDetalle({ id, proyectoInicial = null, alVolver = null }) {
  const [proyecto, setProyecto] = useState(proyectoInicial);
  const [servicios, setServicios] = useState([]);
  const [cargando, setCargando] = useState(!proyectoInicial);
  const [error, setError] = useState(null);

  //imagen elegida en la galeria del detalle
  const [indiceGaleria, setIndiceGaleria] = useState(0);

  //mp4 resuelto para los videos de adobe (llegan como embed con url firmada que expira)
  const [mp4Resuelto, setMp4Resuelto] = useState(null);

  //al entrar: se trae el proyecto (si no vino) y la lista de servicios
  useEffect(() => {
    let activo = true;
    obtenerServicios()
      .then((lista) => setServicios(ordenarAnimacionPrimero(lista, (s) => s.slug)))
      .catch(() => {});

    if (!proyectoInicial) {
      obtenerProyectoPorId(id)
        .then(setProyecto)
        .catch((e) => setError(e.message))
        .finally(() => setCargando(false));
    }

    return () => {
      activo = false;
    };
  }, [id]);

  //al ver otro proyecto la galeria vuelve a arrancar desde la primera imagen
  useEffect(() => {
    setIndiceGaleria(0);
  }, [proyecto?._id]);

  //los videos de behance son embeds de adobe ccv con url firmada (expiran): se resuelve el mp4
  //actual desde la api, igual que en el hero de la home; un video subido a mano (mp4 directo)
  //no hace falta resolverlo y queda tal cual
  useEffect(() => {
    let activo = true;
    const ccv = /player\/ccv\/([A-Za-z0-9_-]{6,})\//.exec(proyecto?.video ?? '')?.[1];
    if (!ccv) {
      setMp4Resuelto(null);
      return undefined;
    }
    urlVideoCcV(ccv)
      .then((r) => {
        if (activo) setMp4Resuelto(r.mp4 ?? null);
      })
      .catch(() => {
        //sin mp4 no se muestra el reproductor y listo (el link a behance sigue estando)
        if (activo) setMp4Resuelto(null);
      });
    return () => {
      activo = false;
    };
  }, [proyecto?.video]);

  // mismo boton flotante de volver que usan las demas paginas (ver BackButton.astro)
  const claseVolver =
    'relative md:fixed md:top-20 md:left-4 z-40 mb-4 md:mb-0 inline-flex items-center justify-center w-14 h-14 rounded-full bg-zinc-900/70 backdrop-blur-md border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 transition-all duration-200 hover:scale-105 active:scale-95';
  const iconoVolver = (
    <svg aria-hidden="true" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
    </svg>
  );
  const volver = alVolver ? (
    <button type="button" onClick={alVolver} aria-label="Volver" title="Volver" className={claseVolver}>
      {iconoVolver}
    </button>
  ) : (
    <a href="/proyectos" aria-label="Volver" title="Volver" className={claseVolver}>
      {iconoVolver}
    </a>
  );

  //estado: error
  if (error) {
    return (
      <section className="max-w-4xl mx-auto px-4 py-16">
        {volver}
        <p role="alert" className="text-red-400 mt-6">
          No se pudo cargar el proyecto.
        </p>
      </section>
    );
  }

  //estado: cargando
  if (cargando) {
    return (
      <section className="max-w-4xl mx-auto px-4 py-16">
        {volver}
        <Loading claseContenedor="h-48" />
      </section>
    );
  }

  //estado: sin datos
  if (!proyecto) {
    return (
      <section className="max-w-4xl mx-auto px-4 py-16">
        {volver}
        <p className="text-zinc-400 mt-6">No encontramos ese proyecto.</p>
      </section>
    );
  }

  const categoriasProyecto = categoriasDeProyecto(proyecto);

  //galeria del proyecto: arranca por la imagen que mejor lo representa
//(la de behance si esta publicado alla, o la captura del deploy si es una app web)
  const galeria = galeriaProyecto(proyecto);

  //video del detalle: un embed de adobe se resuelve a mp4 y cualquier otra url se usa tal cual
  const esEmbedCcV = /player\/ccv\/([A-Za-z0-9_-]{6,})\//.test(proyecto.video ?? '');
  const urlVideo = esEmbedCcV ? mp4Resuelto : (proyecto.video ?? '');

  //ficha del proyecto tal como behance la muestra: la descripcion completa solo se muestra
  //si aporta algo mas que el resumen que ya esta arriba (si no, seria repetir lo mismo);
  //y si la descripcion es tuya (editada desde el panel), tu texto manda y no se muestra la de behance.
  //la comparacion se hace sobre el TEXTO PLANO: el resumen se guarda ya limpio y la descripcion
  //completa con sus etiquetas html, asi que comparar los crudos hacia atras siempre encontraba
  //diferencias y el mismo parrafo terminaba apareciendo dos veces (bajada y ficha)
  const textoPlano = (texto) => String(texto ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  const descripcionLarga =
    !proyecto.resumenManual &&
    proyecto.descripcionCompleta &&
    textoPlano(proyecto.descripcionCompleta) !== textoPlano(proyecto.resumen)
      ? proyecto.descripcionCompleta
      : '';
  const palabrasClave = (proyecto.palabrasClave ?? []).filter(Boolean);
  const estadisticas = proyecto.estadisticas ?? null;
  //las fechas se guardan en utc para que el dia no corra segun el navegador
  const fechaPublicacion = proyecto.publicadoEn
    ? new Intl.DateTimeFormat('es-AR', { dateStyle: 'long', timeZone: 'UTC' }).format(
        new Date(proyecto.publicadoEn)
      )
    : '';
  const hayFicha = Boolean(descripcionLarga || estadisticas || fechaPublicacion || palabrasClave.length);

  return (
    <section className="max-w-4xl mx-auto px-4 py-16">
      {volver}
      {/*encabezado: eyebrow, titulo, categorias y descripcion*/}
      <div className="flex items-start justify-between gap-4 flex-wrap pt-2">
        <div className="min-w-0">
          <p className="text-verde-app font-medium tracking-widest uppercase text-sm">Proyecto</p>
          <h1 className="text-4xl font-bold text-white mt-2">{proyecto.titulo}</h1>
          <ul className="flex flex-wrap gap-2 mt-4">
            {categoriasProyecto.map((slug) => {
              const nombre = servicios.find((s) => s.slug === slug)?.nombre ?? slug;
              return (
                <li key={slug}>
                  {esCategoriaConocida(servicios, slug) ? (
                    <a
                      href={`/servicios/${slug}`}
                      className="text-xs px-3 py-1 rounded-full bg-verde-app/10 text-verde-app border border-verde-app/20 hover:bg-verde-app/20 transition-colors"
                    >
                      {nombre}
                    </a>
                  ) : (
                    <span className="text-xs px-3 py-1 rounded-full bg-verde-app/10 text-verde-app border border-verde-app/20">
                      {nombre}
                    </span>
                  )}
                </li>
              );
            })}
            {(proyecto.tags ?? []).map((tag) => (
              <li
                key={tag}
                className="text-xs px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700"
              >
                {tag}
              </li>
            ))}
          </ul>
          {proyecto.resumen && (
            <p className="text-lg text-zinc-400 leading-relaxed mt-6 whitespace-pre-line">{proyecto.resumen}</p>
          )}
        </div>
      </div>

      {/*video del proyecto: se reproduce aca mismo para no sacar al visitante del sitio.
          el poster es solo el cuadro que se ve mientras carga, no agrega una imagen debajo*/}
      {urlVideo && (
        <figure className="mt-8">
          <video
            src={urlVideo}
            poster={galeria[0] ?? imagenPreferida(proyecto) ?? undefined}
            controls
            preload="metadata"
            className="w-full rounded-2xl border border-zinc-800 bg-black"
          >
            Tu navegador no puede reproducir este video.
          </video>
        </figure>
      )}

      {galeria.length > 0 && (
        <figure className="mt-8 space-y-3">
          {galeria.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {galeria.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIndiceGaleria(i)}
                  className={`shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 transition-colors cursor-pointer ${
                    i === indiceGaleria ? 'border-verde-app' : 'border-zinc-800 hover:border-zinc-600'
                  }`}
                  aria-label={`Ver imagen ${i + 1}`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
          {/*en proyectos de desarrollo la imagen lleva al sitio publicado (ej. vercel);
              en los de behance no, porque el boton de abajo ya lleva a behance*/}
          {(() => {
            const imagenPrincipal = (
              <img
                src={galeria[Math.min(indiceGaleria, galeria.length - 1)]}
                alt={`Imagen del proyecto ${proyecto.titulo}`}
                className="w-full rounded-2xl border border-zinc-800"
              />
            );
            if (!esDespliegue(proyecto) || !proyecto.link) return imagenPrincipal;
            return (
              <a
                href={proyecto.link}
                target="_blank"
                rel="noopener noreferrer"
                title={`Abrir ${proyecto.titulo} en una pestaña nueva`}
                className="block rounded-2xl overflow-hidden ring-offset-2 ring-offset-zinc-950 hover:ring-2 hover:ring-verde-app/60 transition-all"
              >
                {imagenPrincipal}
              </a>
            );
          })()}
        </figure>
      )}

      {proyecto.link && (
        <p className="mt-8">
          <a
            href={proyecto.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-violeta-app text-black font-medium hover:bg-violeta-app/90 hover:scale-105 active:scale-95 active:bg-violeta-app/80 transition-all duration-200"
          >
            {textoVisitar(proyecto)} <span aria-hidden="true">↗</span>
          </a>
        </p>
      )}

      {/*ficha sincronizada desde behance: descripcion completa, estadisticas, fecha y keywords
          (solo aparece si el proyecto es de behance y ya se sincronizo su detalle)*/}
      {hayFicha && (
        <section className="mt-10 p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800">
          <h2 className="text-lg font-semibold text-white">Sobre el proyecto</h2>

          {descripcionLarga && (
            <p className="text-zinc-400 leading-relaxed mt-3 whitespace-pre-line">{descripcionLarga}</p>
          )}

          {(estadisticas || fechaPublicacion) && (
            <ul className="flex flex-wrap gap-x-6 gap-y-2 mt-4 text-sm text-zinc-400">
              {estadisticas && (
                <>
                  <li>
                    <span className="text-white font-semibold">
                      {(estadisticas.vistas ?? 0).toLocaleString('es-AR')}
                    </span>{' '}
                    vistas
                  </li>
                  <li>
                    <span className="text-white font-semibold">
                      {(estadisticas.apreciaciones ?? 0).toLocaleString('es-AR')}
                    </span>{' '}
                    apreciaciones
                  </li>
                  <li>
                    <span className="text-white font-semibold">
                      {(estadisticas.comentarios ?? 0).toLocaleString('es-AR')}
                    </span>{' '}
                    comentarios
                  </li>
                </>
              )}
              {fechaPublicacion && <li>Publicado el {fechaPublicacion}</li>}
            </ul>
          )}

          {palabrasClave.length > 0 && (
            <div className="mt-5">
              <p className="text-xs uppercase tracking-widest text-zinc-500">Palabras clave</p>
              <ul className="flex flex-wrap gap-2 mt-2">
                {palabrasClave.map((palabra) => (
                  <li
                    key={palabra}
                    className="text-xs px-3 py-1 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700"
                  >
                    {palabra}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/*aprendizajes: texto propio de la dueña, siempre visible si esta escrito
        (es lo que el proyecto aprendio/resolvio, no un listado de herramientas)*/}
      {proyecto.aprendizajes && (
        <section className="mt-10 p-6 rounded-2xl bg-verde-app/5 border border-verde-app/20">
          <h2 className="text-lg font-semibold text-verde-app">Qué aprendí</h2>
          <p className="text-zinc-300 leading-relaxed mt-3 whitespace-pre-line">{proyecto.aprendizajes}</p>
        </section>
      )}

      {/*comentarios: cualquiera lee, para comentar hay que registrarse o entrar*/}
      <Comentarios proyectoId={proyecto._id} />

    </section>
  );
}