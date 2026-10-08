//carrusel de proyectos destacados de la home: avanza solo (una lista duplicada que se
//desplaza en loop) y se frena cuando el mouse esta encima o el foco entra a una tarjeta.
//son los que el visitante marco como destacados y no lleva filtros.
import { useEffect, useState } from 'react';
import { obtenerProyectosDestacados } from '../api/proyectos.js';
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

  // Para evitar huecos vacíos cuando hay pocos ítems, duplicamos lo suficiente el array
  const multiplicador = proyectos.length < 5 ? 4 : 2;
  const loopProyectos = Array(multiplicador).fill(proyectos).flat();

  return (
    <div className="relative w-full overflow-hidden py-5">
      <h2 className="px-10 text-3xl font-bold mb-10 relative z-10 text-left">
        Proyectos destacados
      </h2>
      <div
        className="flex items-start gap-6 w-max will-change-transform animate-carrusel-loop hover:[animation-play-state:paused] focus-within:[animation-play-state:paused]"
        style={{ '--carrusel-duracion': '30s' }}
      >
        {loopProyectos.map((proyecto, index) => (
          <div
            key={`${proyecto._id || index}-${index}`}
            className={`relative inline-block ${TARJETA_DESTACADA} shrink-0 cursor-pointer overflow-visible rounded-lg transition-transform duration-300 hover:scale-105`}
          >
            <ProyectoCard proyecto={proyecto} destacado />
          </div>
        ))}
      </div>
    </div>
  );
}