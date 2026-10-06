//redes y nombre del pie de pagina, traidos del perfil de la api
//asi cuando se edita el perfil (redes, whatsapp o nombre) el footer cambia solo
import { useEffect, useState } from 'react';
import { obtenerPerfil } from '../api/perfil.js';

//mapa entre la red guardada en el perfil y su etiqueta e icono
const REDES = [
  { campo: 'linkedin', texto: 'LinkedIn', icono: '/img/li.png' },
  { campo: 'instagram', texto: 'Instagram', icono: '/img/ig.png' },
  { campo: 'threads', texto: 'Threads', icono: '/img/th.png' },
  { campo: 'behance', texto: 'Behance', icono: '/img/be.png' },
];

export default function FooterRedes() {
  const [perfil, setPerfil] = useState(null);

  useEffect(() => {
    const cargar = () => {
      obtenerPerfil()
        .then(setPerfil)
        .catch(() => setPerfil(null));
    };
    cargar();
    //si el perfil se guardo desde el panel, se vuelve a cargar solo
    window.addEventListener('perfil-actualizado', cargar);
    return () => window.removeEventListener('perfil-actualizado', cargar);
  }, []);

  //si todavia no llego la respuesta (o fallo) se usan los mismos valores de siempre
  const redes = perfil?.redes ?? {};
  const nombre = perfil?.nombre || 'Agustina Ferraro';
  const whatsapp = perfil?.whatsapp || '5491131166948';

  const enlaces = [
    ...REDES.filter((red) => redes[red.campo]).map((red) => ({
      texto: red.texto,
      icono: red.icono,
      href: redes[red.campo],
    })),
    { texto: 'WhatsApp', icono: '/img/wh.png', href: `https://wa.me/${whatsapp}` },
  ];

  const anio = new Date().getFullYear();

  return (
    <>
      <ul className="flex flex-wrap justify-center items-center gap-7">
        {enlaces.map((enlace) => (
          <li key={enlace.texto}>
            <a
              href={enlace.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 text-sm text-zinc-400 hover:text-white hover:scale-110 active:scale-95 transition-all duration-200 p-1.5 group"
            >
              <img src={enlace.icono} alt="" className="w-11 h-11 object-contain transition-transform duration-200" />
              <span>{enlace.texto}</span>
            </a>
          </li>
        ))}
      </ul>

      <p className="text-sm text-zinc-500">© {anio} {nombre}</p>
    </>
  );
}