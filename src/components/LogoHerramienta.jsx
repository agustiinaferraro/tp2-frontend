//logos de los programas que aparecen en "lo que manejo" (seccion de habilidades)
//son marcas registradas: se dibujan con su color caracteristico para identificarlas de una mirada

//la mayoria son marcas con iniciales sobre su color de marca
const MONOGRAMAS = {
  photoshop: { fondo: '#001e36', texto: 'Ps', color: '#31a8ff' },
  illustrator: { fondo: '#330000', texto: 'Ai', color: '#ff9a00' },
  premiere: { fondo: '#2a0634', texto: 'Pr', color: '#9999ff' },
  aftereffects: { fondo: '#00005b', texto: 'Ae', color: '#9999ff' },
  html: { fondo: '#e34f26', texto: '5', color: '#ffffff' },
  css: { fondo: '#1572b6', texto: '3', color: '#ffffff' },
  javascript: { fondo: '#f7df1e', texto: 'JS', color: '#323330' },
};

//figma: los cinco bloques de colores de la marca
function Figma({ className = '' }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 28.5" className={className}>
      <path d="M0 9.5A9.5 9.5 0 0 1 9.5 0H12v19H9.5A9.5 9.5 0 0 1 0 9.5" fill="#1abcfe" />
      <path d="M12 0h2.5a9.5 9.5 0 0 1 0 19H12z" fill="#0acf83" />
      <path d="M0 9.5h12V19H9.5A9.5 9.5 0 0 1 0 9.5" fill="#ff7262" />
      <path d="M12 9.5h2.5a9.5 9.5 0 0 1 0 9.5H12z" fill="#a259ff" />
      <path d="M0 19h12v9.5H9.5A9.5 9.5 0 0 1 0 19" fill="#f24e1e" />
    </svg>
  );
}

//react: el atomo con sus tres orbitas
function React({ className = '' }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="#61dafb" strokeWidth="1.1">
      <circle cx="12" cy="12" r="2.1" fill="#61dafb" stroke="none" />
      <ellipse cx="12" cy="12" rx="11" ry="4.2" />
      <ellipse cx="12" cy="12" rx="11" ry="4.2" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="11" ry="4.2" transform="rotate(120 12 12)" />
    </svg>
  );
}

//devuelve el logo pedido o null si esa herramienta no tiene uno
export default function LogoHerramienta({ logo, className = 'w-5 h-5' }) {
  if (logo === 'figma') return <Figma className={className} />;
  if (logo === 'react') return <React className={className} />;

  const marca = MONOGRAMAS[logo];
  if (!marca) return null;

  //los escudos (html, css) llevan el numero adentro de la forma de marca
  if (logo === 'html' || logo === 'css') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className={className}>
        <path
          d="M2 1h20v13.4c0 4.2-3.4 7.4-8 8.6-1-.3-1.8-.6-2-.9-.2.3-1 .6-2 .9-4.6-1.2-8-4.4-8-8.6z"
          fill={marca.fondo}
        />
        <text
          x="12"
          y="16"
          textAnchor="middle"
          fontFamily="Arial, Helvetica, sans-serif"
          fontWeight="bold"
          fontSize="10"
          fill={marca.color}
        >
          {marca.texto}
        </text>
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className}>
      <rect width="24" height="24" rx="5" fill={marca.fondo} />
      <text
        x="12"
        y="16.5"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="bold"
        fontSize={marca.texto.length > 2 ? 8 : 11}
        fill={marca.color}
      >
        {marca.texto}
      </text>
    </svg>
  );
}