//grilla de servicios (parte dinamica de la seccion)
//se apoya en la capa de datos (api/servicios.js) para obtener la informacion
//cada servicio se ilustra con un proyecto del mismo rubro
//en la home se muestra como carrusel horizontal (se ve un poco de la siguiente)
//en la pagina /servicios se muestra como grilla, que es lo que se pide al entrar ahi
//maneja los estados: "cargando", "con datos", "sin datos" y "error"
import { useEffect, useMemo, useState } from 'react';
import { obtenerServicios } from '../api/servicios.js';
import { obtenerProyectos } from '../api/proyectos.js';
import ServicioCard from './ServicioCard.jsx';
import Carrusel from './Carrusel.jsx';
import Loading from './Loading.jsx';

//categorias de un proyecto: la lista nueva ("servicios") o la vieja ("servicio")
function categoriasDeProyecto(proyecto) {
  const lista = Array.isArray(proyecto.servicios) && proyecto.servicios.length
    ? proyecto.servicios
    : proyecto.servicio
      ? [proyecto.servicio]
      : [];
  return lista.map((s) => String(s).trim());
}

//portada de cada rubro: el proyecto del rubro que mejor se vea como foto.
//orden de preferencia:
//  1) un proyecto destacado del rubro con una foto real subida (no un dibujo)
//  2) cualquier proyecto del rubro con foto real
//  3) un proyecto de desarrollo del rubro (se ve la captura de su deploy en vercel)
//  4) cualquier otro proyecto del rubro, que al menos tiene el dibujo del importador
//cada servicio recibe un proyecto distinto: varios rubros comparten proyectos (por ejemplo
//motion y edicion de video tienen los mismos), y sin esto los dos mostrarian la misma portada
function PortadasPorRubro(proyectos, slugs) {
  const portadas = new Map();
  const usados = new Set();
  const conFotoReal = (p) => (p.imagen || p.imagenes?.[0]) && !/^data:image\/svg\+xml/i.test(p.imagen || p.imagenes?.[0]);
  const delRubro = (slug) => (p) => categoriasDeProyecto(p).includes(slug);
  const esDesarrollo = (p) => categoriasDeProyecto(p).includes('desarrollo-full-stack');

  //primero pasan los destacados (se ordenan aparte, pero llegan en el mismo array)
  const candidatos = [
    ...proyectos.filter((p) => p.destacado && conFotoReal(p)),
    ...proyectos.filter((p) => !p.destacado && conFotoReal(p)),
    //los proyectos de desarrollo aportan la captura de su deploy (no hace falta tener foto)
    ...proyectos.filter(esDesarrollo),
    ...proyectos,
  ];

  for (const slug of slugs) {
    //se saltea lo ya usado como portada por otro rubro, asi no se repite la misma imagen
    const elegido =
      candidatos.find((p) => !usados.has(p._id) && delRubro(slug)(p)) ??
      candidatos.find((p) => delRubro(slug)(p)) ??
      null;
    if (elegido) {
      portadas.set(slug, elegido);
      usados.add(elegido._id);
    }
  }
  return portadas;
}

export default function GrillaServicios({ vista = 'carrusel' }) {
  const [servicios, setServicios] = useState([]); //lista de servicios
  const [proyectos, setProyectos] = useState([]); //todos los proyectos (para elegir la portada)
  const [cargando, setCargando] = useState(true); //¿esta cargando?
  const [error, setError] = useState(null); //¿hubo error?

  //se ejecuta una vez al montar el componente: pide los servicios al backend
  useEffect(() => {
    obtenerServicios()
      .then((datos) => setServicios(datos))
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
    //en paralelo trae los proyectos, que son la portada de cada rubro
    obtenerProyectos()
      .then(setProyectos)
      .catch(() => {});
  }, []);

  //una portada distinta por servicio (los rubros que comparten proyectos no se repiten)
  const portadas = useMemo(
    () => PortadasPorRubro(proyectos, servicios.map((s) => s.slug ?? s._id)),
    [proyectos, servicios],
  );

  //estado: error
  if (error) {
    return (
      <p role="alert" className="text-red-400 text-center">
        No se pudieron cargar los servicios. Verificá que el backend esté corriendo.
      </p>
    );
  }

  //estado: cargando
  if (cargando) {
    return <Loading claseContenedor="h-48" />;
  }

  //estado: sin datos
  if (servicios.length === 0) {
    return <p className="text-zinc-400 text-center">Todavía no hay servicios cargados.</p>;
  }

  const tarjeta = (servicio) => (
    <ServicioCard
      servicio={servicio}
      proyecto={portadas.get(servicio.slug ?? servicio._id) ?? null}
    />
  );

  //en la pagina de servicios se muestra una grilla; en la home, el carrusel horizontal
  if (vista === 'grilla') {
    return (
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {servicios.map((servicio) => (
          <li key={servicio._id}>{tarjeta(servicio)}</li>
        ))}
      </ul>
    );
  }

  //estado: con datos → se muestran las tarjetas en un carrusel horizontal
  return (
    <Carrusel etiqueta="Servicios" clave="servicios">
      {servicios.map((servicio) => (
        <li key={servicio._id} className="shrink-0 snap-start w-[clamp(12rem,58%,15rem)]">
          {tarjeta(servicio)}
        </li>
      ))}
    </Carrusel>
  );
}