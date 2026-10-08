//grilla de proyectos (parte dinamica de la seccion)
//se apoya en la capa de datos (api/proyectos.js) para obtener la informacion
//maneja los estados: "cargando", "con datos", "sin datos" y "error"
//los chips de arriba filtran la grilla por categoria (interaccion significativa)
//un proyecto puede estar en varias categorias (campo "servicios") y aparece en todas
//si la url trae ?id=, en lugar de la grilla muestra el detalle de ese proyecto
import { useEffect, useState } from 'react';
import { obtenerProyectos } from '../api/proyectos.js';
import { obtenerServicios } from '../api/servicios.js';
import ProyectoDetalle from './ProyectoDetalle.jsx';
import ProyectoCard from './ProyectoCard.jsx';
import Carrusel, { ALTO_PROYECTO, TARJETA_CARRUSEL } from './Carrusel.jsx';
import Loading from './Loading.jsx';

//marca interna para el chip "sin categoria"
const SIN_CATEGORIA = '__sin_categoria__';

//categorias de un proyecto: la lista nueva ("servicios") o la vieja ("servicio")
function categoriasDeProyecto(proyecto) {
  const lista = Array.isArray(proyecto.servicios) && proyecto.servicios.length
    ? proyecto.servicios
    : proyecto.servicio
      ? [proyecto.servicio]
      : [];
  return [...new Set(lista.map((s) => String(s).trim()).filter(Boolean))];
}

//seccion con titulo y carrusel horizontal de proyectos
function SeccionCarrusel({ clave, nombre, items }) {
  return (
    <Carrusel
      etiqueta={`Proyectos de ${nombre}`}
      clave={clave}
      titulo={
        <h2 className="text-2xl font-bold text-white mb-1">
          {nombre} <span className="ml-2 text-sm font-normal text-zinc-500">({items.length})</span>
        </h2>
      }
    >
      {items.map((proyecto) => (
        <li
          key={proyecto._id}
          className={`shrink-0 snap-start ${TARJETA_CARRUSEL} ${ALTO_PROYECTO}`}
        >
          <ProyectoCard proyecto={proyecto} />
        </li>
      ))}
    </Carrusel>
  );
}

//version grilla (pagina de proyectos): todas las tarjetas a la vista, sin flechas
function SeccionGrilla({ nombre, items }) {
  return (
    <section aria-label={`Proyectos de ${nombre}`} className="space-y-4">
      <h2 className="text-2xl font-bold text-white">
        {nombre} <span className="ml-2 text-sm font-normal text-zinc-500">({items.length})</span>
      </h2>
      <ul className="animar-grupo grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((proyecto) => (
          //mismo alto que en los carruseles: si se pone otro numero aqui, las tarjetas
          //de la grilla se quedan cortas y el resumen queda cortado a la mitad
          <li key={proyecto._id} className={ALTO_PROYECTO}>
            <ProyectoCard proyecto={proyecto} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function GrillaProyectos({ vista = 'carrusel' }) {
  const [proyectos, setProyectos] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [detalleId, setDetalleId] = useState(null);
  const [categoria, setCategoria] = useState('');

  //se lee la url del lado del cliente (en el server no existe window)
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('id');
    setDetalleId(id);
    const esDetalle = Boolean(id);
    document.documentElement.classList.toggle('viendo-detalle', esDetalle);
    const tituloSeccion = document.querySelector('.encabezado-seccion-proyectos');
    if (tituloSeccion) tituloSeccion.style.display = esDetalle ? 'none' : '';
  }, []);

  //se cargan los proyectos y la lista de servicios para los filtros
  useEffect(() => {
    obtenerProyectos()
      .then((datos) => setProyectos(datos))
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
    obtenerServicios()
      .then((lista) => setServicios(lista))
      .catch(() => {});
  }, []);

  //si el usuario usa el boton "atras" del navegador, se re-sincroniza con la url
  useEffect(() => {
    const alVolverPagina = () => {
      const id = new URLSearchParams(window.location.search).get('id');
      const esDetalle = Boolean(id);
      setDetalleId(id);
      document.documentElement.classList.toggle('viendo-detalle', esDetalle);
      const tituloSeccion = document.querySelector('.encabezado-seccion-proyectos');
      if (tituloSeccion) tituloSeccion.style.display = esDetalle ? 'none' : '';
    };
    window.addEventListener('popstate', alVolverPagina);
    return () => window.removeEventListener('popstate', alVolverPagina);
  }, []);

  //categorias con proyectos para mostrar como chips de filtro
  const conCategoria = [
    ...new Set(proyectos.flatMap((p) => categoriasDeProyecto(p))),
  ];
  const tieneSinCategoria = proyectos.some((p) => categoriasDeProyecto(p).length === 0);
  const categorias = [
    { slug: '', nombre: 'Todos' },
    ...conCategoria.map((slug) => ({
      slug,
      nombre: servicios.find((s) => s.slug === slug)?.nombre ?? slug,
    })),
    ...(tieneSinCategoria ? [{ slug: SIN_CATEGORIA, nombre: 'Sin categoría' }] : []),
  ];

  //proyectos que entran en una categoria (o los que no tienen ninguna)
  const proyectosDeCategoria = (slug) =>
    slug === SIN_CATEGORIA
      ? proyectos.filter((p) => categoriasDeProyecto(p).length === 0)
      : proyectos.filter((p) => categoriasDeProyecto(p).includes(slug));

  const nombreDeCategoria = (slug) =>
    slug === SIN_CATEGORIA
      ? 'Sin categoría'
      : (servicios.find((s) => s.slug === slug)?.nombre ?? slug);

  //filtro local por categoria
  const visibles = categoria === '' ? proyectos : proyectosDeCategoria(categoria);

  //un solo carrusel con todos los proyectos: al filtrar, ese mismo carrusel muestra solo los filtrados
  const nombreCarrusel = categoria === '' ? 'Todos los proyectos' : nombreDeCategoria(categoria);

  //en la grilla cada categoria lleva su propio titulo: con "Todos" se muestran todas juntas,
  //y al elegir un chip queda solo esa
  const grupos =
    categoria === ''
      ? [
          ...conCategoria.map((slug) => ({ slug, nombre: nombreDeCategoria(slug), items: proyectosDeCategoria(slug) })),
          ...(tieneSinCategoria
            ? [{ slug: SIN_CATEGORIA, nombre: 'Sin categoría', items: proyectosDeCategoria(SIN_CATEGORIA) }]
            : []),
        ].filter((g) => g.items.length > 0)
      : [{ slug: categoria, nombre: nombreCarrusel, items: visibles }];

  //estado: detalle de un proyecto (al llegar con ?id= o al tocar una tarjeta)
  if (detalleId) {
    const yaCargado = proyectos.find((p) => p._id === detalleId);
    return (
      <ProyectoDetalle
        id={detalleId}
        proyectoInicial={yaCargado ?? null}
        alVolver={() => {
          setDetalleId(null);
          document.documentElement.classList.remove('viendo-detalle');
          const tituloSeccion = document.querySelector('.encabezado-seccion-proyectos');
          if (tituloSeccion) tituloSeccion.style.display = '';
          window.history.replaceState({}, '', window.location.pathname);
        }}
      />
    );
  }

  //estado: error
  if (error) {
    return (
      <p role="alert" className="text-red-400 text-center">
        No se pudieron cargar los proyectos. Verificá que el backend esté corriendo.
      </p>
    );
  }

  //estado: cargando
  if (cargando) {
    return <Loading claseContenedor="h-48" />;
  }

  //estado: sin datos
  if (proyectos.length === 0) {
    return (
      <p className="text-zinc-400 text-center">
        Todavía no hay proyectos cargados. Pronto vas a poder ver mis trabajos acá.
      </p>
    );
  }

  //estado: con datos
  //cada tarjeta lleva a la pagina de detalle con ?id=
  return (
    <div className="space-y-6">
      {/*filtro por categoria: scroll horizontal, en pantallas chicas se ve apenas la proxima*/}
      {categorias.length > 1 && (
        <ul
          className="flex gap-2 overflow-x-auto snap-x pb-2 carrusel-scroll"
          aria-label="Filtrar proyectos por categoría"
          role="group"
        >
          {categorias.map((c) => (
            <li key={c.slug} className="shrink-0 snap-start">
              <button
                type="button"
                onClick={() => setCategoria(c.slug)}
                aria-pressed={categoria === c.slug}
                className={`px-3 py-1 rounded-full text-sm border transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95 ${
                  categoria === c.slug
                    ? 'bg-violeta-app text-black border-violeta-app'
                    : 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:border-verde-app/50'
                }`}
              >
                {c.nombre}
              </button>
            </li>
          ))}
        </ul>
      )}

      {vista === 'grilla' ? (
        grupos.length === 0 ? (
          <p className="text-zinc-400 text-center">No hay proyectos en esta categoría todavía.</p>
        ) : (
          <div className="space-y-12">
            {grupos.map((grupo) => (
              <SeccionGrilla key={grupo.slug} nombre={grupo.nombre} items={grupo.items} />
            ))}
          </div>
        )
      ) : visibles.length === 0 ? (
        <p className="text-zinc-400 text-center">No hay proyectos en esta categoría todavía.</p>
      ) : (
        <SeccionCarrusel clave={categoria || 'todos'} nombre={nombreCarrusel} items={visibles} />
      )}
    </div>
  );
}