//preview de la portada de un proyecto para las tarjetas: si tiene video o gif animado,
//se mueve solo antes de que se lo presione, como en behance.
//que se muestra (en este orden):
//  - video reproducible (embed de adobe resuelto a mp4, o un .mp4/.webm directo) → se
//    reproduce mudo y en loop. los iframes (youtube/vimeo) no se usan aca: no se les puede
//    detectar el fallo y en una grilla con varias tarjetas pesarian; ese video completo
//    se ve igual en el detalle del proyecto
//  - si no hay video (o no se pudo resolver), la imagen normal del proyecto: si subio un
//    gif animado, la portada es el gif y ya se mueve sola sin pedirle nada al navegador
//como se cuida la caida:
//  - el video recien se monta cuando la tarjeta entra en pantalla y se pausa al salir
//    (si no, con la grilla cargada se bajarian todos los videos juntos de una)
//  - si da error, o estando en pantalla tarda mas de ESPERA_VIDEO_MS en poder
//    reproducirse de verdad (sin wifi, adobe caido, url firmada vencida), se cae a la
//    imagen de behance y, si esa tampoco, a la miniatura default con la inicial del
//    titulo: nunca queda un hueco ni un video roto
import { useEffect, useRef, useState } from 'react';
import ImagenProyecto from './ImagenProyecto.jsx';
import { urlVideoCcV } from '../api/behance.js';
import { imagenPreferida } from '../utils/proyectos.js';

//cuanto se espera un video antes de mostrar solo la imagen: un video que no arranca en
//este plazo no va a arrancar esperando mas (mismo criterio que ImagenProyecto)
const ESPERA_VIDEO_MS = 10000;

function idCcV(url) {
  const m = String(url ?? '').match(/player\/ccv\/([A-Za-z0-9_-]{6,})\//);
  return m ? m[1] : null;
}

//devuelve algo reproducible con <video>, o null si el link no sirve para una tarjeta
function fuenteReproducible(url) {
  if (!url) return null;
  const ccv = idCcV(url);
  if (ccv) return { tipo: 'ccv', ccv };
  if (/^https?:\/\/\S+\.(mp4|webm|ogv)(\?\S*)?$/i.test(url)) return { tipo: 'directo', src: url };
  return null;
}

export default function PreviewProyecto({ proyecto, className = '', alternativa = false }) {
  const [mp4, setMp4] = useState(null);
  const [falla, setFalla] = useState(false);
  //vioPantalla: ya se mostro al menos una vez (a partir de ahi el video queda montado);
  //enPantalla: esta en pantalla ahora (para pausarlo y ahorrar datos)
  const [vioPantalla, setVioPantalla] = useState(false);
  const [enPantalla, setEnPantalla] = useState(false);
  const contenedorRef = useRef(null);
  const videoRef = useRef(null);

  const fuente = fuenteReproducible(proyecto?.video);

  //el mp4 de adobe se pide una vez y se reusa (el cache de api/behance.js comparte el
  //resultado con el hero y con las demas tarjetas del mismo proyecto)
  useEffect(() => {
    setMp4(null);
    setFalla(false);
    if (fuente?.tipo !== 'ccv') return undefined;
    let vivo = true;
    urlVideoCcV(fuente.ccv)
      .then((r) => {
        if (!vivo) return;
        if (r?.mp4) setMp4(r.mp4);
        else setFalla(true);
      })
      .catch(() => {
        if (vivo) setFalla(true);
      });
    return () => {
      vivo = false;
    };
  }, [fuente?.tipo, fuente?.ccv]);

  //la tarjeta entra en pantalla: ahi recien se rinde el video. una vez visto, se queda
  //montado aunque se salga, porque recargarlo cada vez que hace scroll seria peor
  useEffect(() => {
    const el = contenedorRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVioPantalla(true);
      setEnPantalla(true);
      return undefined;
    }
    const observador = new IntersectionObserver(
      (entradas) => {
        const visible = entradas.some((e) => e.isIntersecting);
        setEnPantalla(visible);
        if (visible) setVioPantalla(true);
      },
      //mismo margen que usa el navegador para empezar el lazy de las imagenes
      { rootMargin: '300px' },
    );
    observador.observe(el);
    return () => observador.disconnect();
  }, []);

  const srcVideo = fuente?.tipo === 'directo' ? fuente.src : mp4;
  const reproducir = Boolean(srcVideo) && !falla && vioPantalla;

  //techo para el video, pero solo mientras esta EN PANTALLA: uno que quedo montado
  //fuera de la vista esta pausado a proposito (para no bajar datos), asi que no puede
  //pasar de la metadata y declararlo muerto ahi seria un falso positivo que mata el
  //video de tarjetas que el visitante ni llego a ver. al entrar en pantalla arranca el
  //reloj de nuevo: si en ese plazo no puede reproducirse de verdad, ahi si se cae a la imagen
  useEffect(() => {
    if (!reproducir || !enPantalla) return undefined;
    const techo = setTimeout(() => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) setFalla(true);
    }, ESPERA_VIDEO_MS);
    return () => clearTimeout(techo);
  }, [reproducir, enPantalla]);

  //reproduce al entrar y pausa al salir de pantalla. si el navegador bloquea el autoplay,
  //queda el <video> con su poster (la portada de behance), nunca un cuadro negro
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (enPantalla) video.play().catch(() => {});
    else video.pause();
  }, [enPantalla, reproducir]);

  const portada = imagenPreferida(proyecto);

  return (
    <span ref={contenedorRef} className={`block overflow-hidden ${className}`}>
      {reproducir ? (
        <video
          ref={videoRef}
          src={srcVideo}
          poster={portada || undefined}
          muted
          loop
          playsInline
          preload="metadata"
          onError={() => setFalla(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <ImagenProyecto
          proyecto={proyecto}
          alternativa={alternativa}
          className="w-full h-full object-cover"
        />
      )}
    </span>
  );
}
