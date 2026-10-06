//carrusel de proyectos destacados de la home: avanza solo (una lista duplicada que se
//desplaza en loop) y se frena cuando el mouse esta encima o el foco entra a una tarjeta.
//son los que el visitante marco como destacados y no lleva filtros.
import { useEffect, useState } from 'react';
import { obtenerProyectosDestacados } from '../api/proyectos.js';
import Carrusel from './Carrusel.jsx';
import ProyectoCard from './ProyectoCard.jsx';
import Loading from './Loading.jsx';

//tarjetas mas chicas que las del carrusel de proyectos: son las primeras de la home y no
//necesitan tanto ancho
const TARJETA_DESTACADA = 'w-[clamp(11rem,60%,14rem)]';

export default function CarruselDestacados() {
  const [proyectos, setProyectos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    obtenerProyectosDestacados()
      .then((datos) => setProyectos(datos))
      .catch(() => setProyectos([]))
      .finally(() => setCargando(false));
  }, []);

  if (cargando) return <Loading claseContenedor="h-40" />;
  //si no hay nada destacado todavia, la seccion no se muestra
  if (proyectos.length === 0) return null;

  return (
    <Carrusel etiqueta="Proyectos destacados" clave="destacados" auto conFlechas={false} claseLista="">
      {proyectos.map((proyecto) => (
        <li key={proyecto._id} className={`shrink-0 snap-start ${TARJETA_DESTACADA} h-[26rem]`}>
          <ProyectoCard proyecto={proyecto} destacado />
        </li>
      ))}
    </Carrusel>
  );
}