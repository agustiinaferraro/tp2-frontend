//imagen de un proyecto: elige sola la mejor disponible y, si falla, cae a otra
//- proyectos de behance: la imagen que se subio a behance
//- proyectos de desarrollo: la captura de pantalla del deploy en vercel
//- si ninguna carga, muestra el placeholder de color con la inicial del titulo
import { useEffect, useRef, useState } from 'react';
import { esDespliegue, esPlaceholder, imagenPreferida, urlCaptura } from '../utils/proyectos.js';

//cuanto se espera una imagen antes de darla por perdida. thum.io y el cdn de behance a
//veces se quedan esperando sin responder ni con error, y sin este techo la tarjeta se
//queda en blanco para siempre. hay margen de sobra: lo mas lento que se midio fueron 7s
const ESPERA_MAXIMA_MS = 12000;

export default function ImagenProyecto({ proyecto, className = '', alternativa = true }) {
  const preferida = imagenPreferida(proyecto);
  const propia = proyecto?.imagen || proyecto?.imagenes?.[0] || null;
  const imgRef = useRef(null);

  //las capturas externas tardan: se muestran solo cuando ya cargaron
  const [fuente, setFuente] = useState(preferida);

  useEffect(() => {
    setFuente(preferida);
  }, [preferida]);

  //si la captura no carga (servicio caido o deploy caido) se usa la imagen del proyecto.
  //el svg que genera el importador es un placeholder automatico: si es lo unico que hay,
  //se lo salta para ir directo a la inicial del titulo
  const alternativas = esDespliegue(proyecto) && !esPlaceholder(propia) ? [propia] : [];

  //pasa a la siguiente alternativa, o al placeholder si no queda ninguna
  const siguiente = () => {
    setFuente((actual) => alternativas.find((img) => img && img !== actual) ?? null);
  };

  //ademas de onError, hay que tratar el caso de la imagen que nunca carga: si en el plazo
  //no termino de cargar, se da por perdida y se avanza igual
  useEffect(() => {
    if (!fuente) return;
    //una imagen que ya venia en cache carga al instante y no hay que esperarla
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) return;

    //el reloj arranca recien cuando la imagen entra en pantalla. las tarjetas usan
    //loading="lazy", asi que una que esta lejos del viewport todavia no descarga nada: si
    //el plazo corriera desde el montaje, una tarjeta del final de la pagina caeria al
    //placeholder solo por haber estado mucho tiempo arriba, sin intentar cargar nunca
    let techo;
    const observador = new IntersectionObserver(
      (entradas) => {
        if (!entradas.some((e) => e.isIntersecting)) return;
        techo = setTimeout(() => {
          const el = imgRef.current;
          if (!el || !el.complete || el.naturalWidth === 0) siguiente();
        }, ESPERA_MAXIMA_MS);
        observador.disconnect();
      },
      //mismo margen que usa el navegador para decidir cuando empieza a descargar el lazy
      { rootMargin: '300px' },
    );
    observador.observe(img);

    return () => {
      observador.disconnect();
      clearTimeout(techo);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fuente]);

  if (fuente) {
    return (
      <img
        ref={imgRef}
        src={fuente}
        alt={alternativa ? `Imagen del proyecto ${proyecto?.titulo ?? ''}`.trim() : ''}
        loading="lazy"
        onError={siguiente}
        className={className}
      />
    );
  }

  //sin imagen util: circulo con la inicial, para que la card nunca quede en blanco
  const inicial = (proyecto?.titulo ?? '?').trim().charAt(0).toUpperCase();
  return (
    <span
      aria-hidden="true"
      className={`${className} flex items-center justify-center bg-gradient-to-br from-violeta-app/30 via-zinc-800 to-verde-app/20 text-white font-bold select-none`}
    >
      {inicial}
    </span>
  );
}