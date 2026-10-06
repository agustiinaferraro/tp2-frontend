//hero de la home: carrusel con los videos de los proyectos
//cada video se reproduce solo (muted, loop) hasta 7 segundos y luego funde al siguiente
//solo entran los proyectos de edicion de video (videos, animaciones, trailers): el resto
//(branding, apps, web) no tiene video real y queda afuera del carrusel
import { useEffect, useRef, useState } from 'react';
import { obtenerProyectos, obtenerProyectosDestacados } from '../api/proyectos.js';
import { urlVideoCcV } from '../api/behance.js';
import Loading from './Loading.jsx';

//segundos que se reproduce cada video y duracion del fundido entre uno y otro
const MAX_SEGUNDOS = 7;
const INTERVALO_MS = MAX_SEGUNDOS * 1000;
const DURACION_FUNDIDO_MS = 500;

//categoria de videos, animaciones y trailers: es lo unico que rota en el hero
const SERVICIO_VIDEO = 'edicion-de-video';

//los videos de behance se alojan en adobe ccv con una url firmada que expira:
//el proyecto guarda el embed estable y aca se resuelve el mp4 actual cuando hace falta
function esUrlCcV(url) {
  return /player\/ccv\/([A-Za-z0-9_-]{6,})\//.test(url ?? '');
}

function idCcV(url) {
  const m = String(url ?? '').match(/player\/ccv\/([A-Za-z0-9_-]{6,})\//);
  return m ? m[1] : null;
}

//convierte la url del proyecto en algo reproducible:
//  - embed de adobe (behance) → mp4 directo resuelto en vivo
//  - links de youtube/vimeo → iframe (autoplay mudo en loop)
//  - cualquier .mp4/.webm → video directo
function urlDelVideo(url, mp4s) {
  if (esUrlCcV(url)) {
    const mp4 = mp4s?.[idCcV(url)];
    //si el mp4 todavia no cargo, se muestra la portada mientras tanto
    return mp4 ? { tipo: 'video', src: mp4 } : null;
  }
  const youtube = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  if (youtube) {
    const id = youtube[1];
    return {
      tipo: 'iframe',
      src: `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&modestbranding=1&rel=0`,
    };
  }
  const vimeo = url.match(/(?:vimeo\.com|player\.vimeo\.com\/video)\/(\d{6,})/);
  if (vimeo) {
    return {
      tipo: 'iframe',
      src: `https://player.vimeo.com/video/${vimeo[1]}?autoplay=1&muted=1&loop=1&background=1`,
    };
  }
  return { tipo: 'video', src: url };
}

export default function HeroCarrusel({ variante = 'hero' }) {
  const [proyectos, setProyectos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [actual, setActual] = useState(0);
  const [fade, setFade] = useState(true);
  //videos de adobe resueltos: id del ccv → url del mp4 actual
  const [mp4s, setMp4s] = useState({});
  //true mientras dura el fundido: frena cualquier avance que llegue en ese rato
  const rotandoRef = useRef(false);

  //carga: solo los proyectos de edicion de video que tienen video (los destacados arrancan)
  useEffect(() => {
    Promise.all([obtenerProyectos(), obtenerProyectosDestacados().catch(() => [])])
      .then(([todos, destacados]) => {
        const deVideo = todos.filter((p) => p.video && p.servicio === SERVICIO_VIDEO);
        const primero = destacados
          .map((d) => deVideo.find((p) => p._id === d._id))
          .filter(Boolean);
        const yaEstan = new Set(primero.map((p) => p._id));
        setProyectos([...primero, ...deVideo.filter((p) => !yaEstan.has(p._id))]);
      })
      .catch(() => setProyectos([]))
      .finally(() => setCargando(false));
  }, []);

  //resuelve los videos de adobe (url firmada que expira) apenas llegan los proyectos
  useEffect(() => {
    if (proyectos.length === 0) return;
    const pendientes = {};
    for (const proyecto of proyectos) {
      if (!proyecto.video || !esUrlCcV(proyecto.video)) continue;
      const ccv = idCcV(proyecto.video);
      if (ccv && !mp4s[ccv]) {
        pendientes[ccv] = urlVideoCcV(ccv).then((r) => r.mp4).catch(() => null);
      }
    }
    const ids = Object.keys(pendientes);
    if (ids.length === 0) return;
    Promise.all(Object.values(pendientes)).then((resultados) => {
      setMp4s((previo) => {
        const nuevo = { ...previo };
        ids.forEach((ccv, i) => {
          if (resultados[i]) nuevo[ccv] = resultados[i];
        });
        return nuevo;
      });
    });
  }, [proyectos.length]);

  //rotacion automatica: cada 7 segundos se apaga, cambia el proyecto y se enciende
  //el tope de 7 segundos tambien se corta desde el video, asi el clip no llega a reiniciarse
  //el candado evita que el temporizador y el video disparen el cambio al mismo tiempo:
  //sin el, un video largo hace avanzar dos proyectos de un saque
  function avanzar() {
    if (rotandoRef.current || proyectos.length === 0) return;
    rotandoRef.current = true;
    setFade(false);
    setTimeout(() => {
      setActual((previo) => (previo + 1) % proyectos.length);
      setFade(true);
      rotandoRef.current = false;
    }, DURACION_FUNDIDO_MS);
  }

  useEffect(() => {
    if (proyectos.length === 0) return undefined;
    const intervalo = setTimeout(avanzar, INTERVALO_MS);
    return () => clearTimeout(intervalo);
  }, [actual, proyectos.length]);

  if (cargando) {
    return (
      <section aria-label="Proyectos en video" className="max-w-5xl mx-auto px-4 pb-10">
        <div className="h-[400px] md:h-[500px] bg-black rounded-2xl flex overflow-hidden">
          <Loading claseContenedor="" />
        </div>
      </section>
    );
  }

  if (proyectos.length === 0) return null;

  const proyecto = proyectos[actual];
  const video = proyecto.video ? urlDelVideo(proyecto.video, mp4s) : null;
  const esVideo = video?.tipo === 'video';
  const esIframe = video?.tipo === 'iframe';

  //en las paginas el video hace un leve zoom al pasar el mouse; en el hero no molesta
  const claseMedio = variante === 'banner' ? 'transition-transform duration-700 group-hover:scale-105' : '';

  return (
    <section aria-label="Proyectos en video" className="absolute inset-0">
      <a href={`/proyectos/?id=${proyecto._id}`} className="group block relative overflow-hidden h-full w-full">
        {/*fondo negro que tapa el cambio entre un video y otro*/}
        <div
          className={`absolute inset-0 bg-black transition-opacity duration-500 ${
            fade ? 'opacity-0' : 'opacity-100'
          }`}
        />

        {/*video del proyecto; mientras el mp4 de adobe resuelve se ve la portada*/}
        {esVideo ? (
          <video
            key={proyecto._id}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${claseMedio} ${
              fade ? 'opacity-100' : 'opacity-0'
            }`}
            src={video.src}
            autoPlay
            muted
            loop
            playsInline
            //tope de 7 segundos: si el video es mas largo, se corta y pasa al siguiente
            onTimeUpdate={(e) => {
              if (e.currentTarget.currentTime >= MAX_SEGUNDOS) avanzar();
            }}
          />
        ) : esIframe ? (
          <iframe
            key={proyecto._id}
            title={`Video del proyecto ${proyecto.titulo}`}
            src={video.src}
            className={`absolute inset-0 w-full h-full border-0 transition-opacity duration-500 ${claseMedio} ${
              fade ? 'opacity-100' : 'opacity-0'
            }`}
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <img
            key={proyecto._id}
            src={proyecto.imagen || proyecto.imagenes?.[0] || ''}
            alt=""
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
              fade ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )}

        {/*degradado suave para dar profundidad sin tapar el video*/}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/40" />
      </a>
    </section>
  );
}