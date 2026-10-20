//vista "servicios" del panel: para editar nombre, descripcion y "que incluye"
//de cada categoria/servicio sin tener que tocar el codigo
//el slug no se puede cambiar porque es la url de la pagina publica y los
//proyectos lo usan como referencia; los cambios se ven al instante en /servicios/<slug>
import { useEffect, useState } from 'react';
import { obtenerServicios, actualizarServicio } from '../api/servicios.js';
import Loading from './Loading.jsx';

//arma el borrador editable de un servicio a partir de lo guardado en la base
//el "incluye" se edita como texto con un punto por linea (mas comodo que una lista de inputs)
function borradorDe(servicio) {
  return {
    nombre: servicio.nombre ?? '',
    descripcion: servicio.descripcion ?? '',
    incluye: (servicio.incluye ?? []).join('\n'),
  };
}

export default function AdminServicios({ alGuardar = null }) {
  const [servicios, setServicios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  //borrador por slug mientras se edita; si no hay entrada, se usa el valor guardado
  const [borradores, setBorradores] = useState({});
  //slug del servicio que se esta guardando en este momento (uno por vez)
  const [guardandoSlug, setGuardandoSlug] = useState(null);
  //aviso por tarjeta: { slug, texto, tipo }
  const [mensaje, setMensaje] = useState(null);

  useEffect(() => {
    obtenerServicios()
      .then((lista) => {
        setServicios(lista);
        const iniciales = {};
        for (const s of lista) iniciales[s.slug] = borradorDe(s);
        setBorradores(iniciales);
      })
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  }, []);

  //los avisos flotantes de cada tarjeta se apagan solos
  useEffect(() => {
    if (!mensaje) return undefined;
    const t = setTimeout(() => setMensaje(null), 2000);
    return () => clearTimeout(t);
  }, [mensaje]);

  function borradorActual(slug, servicio) {
    return borradores[slug] ?? borradorDe(servicio);
  }

  function cambiarBorrador(slug, campo, valor) {
    setBorradores((previo) => ({
      ...previo,
      [slug]: { ...borradorActual(slug, servicios.find((s) => s.slug === slug)), [campo]: valor },
    }));
  }

  async function guardar(servicio) {
    const borrador = borradorActual(servicio.slug, servicio);
    if (!borrador.nombre.trim()) {
      setMensaje({ slug: servicio.slug, texto: 'El nombre no puede quedar vacío', tipo: 'error' });
      return;
    }
    setGuardandoSlug(servicio.slug);
    setMensaje(null);
    try {
      const respuesta = await actualizarServicio(servicio.slug, {
        nombre: borrador.nombre.trim(),
        descripcion: borrador.descripcion.trim(),
        //un punto del textarea = un item de la lista "que incluye"
        incluye: borrador.incluye
          .split('\n')
          .map((i) => i.trim())
          .filter(Boolean),
      });
      //se actualiza la tarjeta con lo que guardo el backend (con el trim ya aplicado)
      setServicios((previo) =>
        previo.map((s) => (s.slug === servicio.slug ? { ...s, ...(respuesta.datos ?? {}) } : s))
      );
      setBorradores((previo) => ({
        ...previo,
        [servicio.slug]: borradorDe({ ...servicio, ...(respuesta.datos ?? {}) }),
      }));
      setMensaje({ slug: servicio.slug, texto: 'Servicio actualizado', tipo: 'ok' });
      //el panel de proyectos usa la misma lista de categorias: se refresca
      if (alGuardar) alGuardar();
    } catch (e) {
      setMensaje({ slug: servicio.slug, texto: e.message, tipo: 'error' });
    } finally {
      setGuardandoSlug(null);
    }
  }

  const claseInput =
    'w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violeta-app transition-all';

  //estado: error
  if (error) {
    return (
      <p role="alert" className="text-red-400">
        No se pudieron cargar los servicios. {error}
      </p>
    );
  }

  //estado: cargando
  if (cargando) {
    return <Loading claseContenedor="h-48" />;
  }

  //estado: sin servicios cargados
  if (!servicios.length) {
    return <p className="text-zinc-400">Todavía no hay servicios cargados.</p>;
  }

  //estado: lista de servicios, cada uno con su formulario
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Servicios</h2>
        <p className="text-sm text-zinc-400 mt-1">
          Estos textos se ven en la página de cada servicio. Los cambios se publican al instante, sin volver a
          desplegar la web.
        </p>
      </div>

      <ul className="space-y-4">
        {servicios.map((servicio) => {
          const borrador = borradorActual(servicio.slug, servicio);
          const avisando = mensaje?.slug === servicio.slug;
          return (
            <li key={servicio.slug} className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-sm text-zinc-500">
                  /servicios/<span className="text-violeta-app">{servicio.slug}</span>
                </p>
                {avisando && (
                  <p
                    role={mensaje.tipo === 'error' ? 'alert' : 'status'}
                    className={`text-sm ${mensaje.tipo === 'error' ? 'text-red-400' : 'text-green-400'}`}
                  >
                    {mensaje.texto}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label htmlFor={`serv-nombre-${servicio.slug}`} className="block text-sm text-zinc-300">
                  Nombre *
                </label>
                <input
                  id={`serv-nombre-${servicio.slug}`}
                  type="text"
                  value={borrador.nombre}
                  onChange={(e) => cambiarBorrador(servicio.slug, 'nombre', e.target.value)}
                  className={claseInput}
                />
              </div>

              <div className="space-y-1">
                <label htmlFor={`serv-desc-${servicio.slug}`} className="block text-sm text-zinc-300">
                  Descripción
                </label>
                <textarea
                  id={`serv-desc-${servicio.slug}`}
                  value={borrador.descripcion}
                  onChange={(e) => cambiarBorrador(servicio.slug, 'descripcion', e.target.value)}
                  rows={3}
                  className={`${claseInput} resize-y`}
                />
              </div>

              <div className="space-y-1">
                <label htmlFor={`serv-incluye-${servicio.slug}`} className="block text-sm text-zinc-300">
                  Qué incluye (un punto por línea, opcional)
                </label>
                <textarea
                  id={`serv-incluye-${servicio.slug}`}
                  value={borrador.incluye}
                  onChange={(e) => cambiarBorrador(servicio.slug, 'incluye', e.target.value)}
                  rows={4}
                  placeholder={'Diseño de wireframes\nPrototipo interactivo\n...'}
                  className={`${claseInput} resize-y`}
                />
                <p className="text-xs text-zinc-500">Cada línea se muestra con un ✓ en la página del servicio.</p>
              </div>

              <button
                type="button"
                onClick={() => guardar(servicio)}
                disabled={guardandoSlug === servicio.slug}
                className="px-4 py-2 rounded-lg font-medium bg-verde-app hover:bg-verde-app/90 text-black transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {guardandoSlug === servicio.slug ? 'Guardando...' : 'Guardar servicio'}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
