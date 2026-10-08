//respaldo del contenido de "sobre mi"
//la fuente real es el backend (GET /api/perfil). esto se usa solo como
//red de seguridad para que el sitio no se rompa si la api no responde en el build.

export const contenidoRespaldo = {
  estadisticas: [
    { valor: '4º', descripcion: 'año de la Licenciatura en Tecnología Multimedial' },
    { valor: '3', descripcion: 'materias que enseño como ayudante de cátedra' },
    { valor: '2022', descripcion: 'desde cuando diseño, programo y animo' },
    { valor: '1', descripcion: 'pieza ganadora en una competencia por votación' },
  ],
  recorrido: [
    {
      periodo: '2010 – 2015',
      tipo: 'estudio',
      titulo: 'Bachiller en Economía y Administración',
      lugar: 'Escuela Comercial N.º 22 Héroes de Malvinas',
      texto: 'El punto de partida: en la escuela descubrí que quería crear y comunicar.',
    },
    {
      periodo: 'Mar 2022 – Actualidad',
      tipo: 'estudio',
      titulo: 'Licenciatura en Tecnología Multimedial',
      lugar: 'Universidad Maimónides',
      texto:
        'Mi formación principal: diseño, programación, video y UX/UI conviviendo en un mismo plan. Hoy estoy en 4º año.',
    },
    {
      periodo: 'Mar 2022 – Abr 2026',
      tipo: 'logro',
      titulo: 'Técnica en Comunicación Interactiva y Diseño Multimedial',
      lugar: 'Universidad Maimónides',
      insignia: 'Título obtenido',
      texto:
        'Primera etapa terminada: ya soy técnica en comunicación interactiva y diseño multimedial.',
    },
    {
      periodo: 'Mar 2022 – Actualidad',
      tipo: 'trabajo',
      titulo: 'Diseñadora multimedial',
      lugar: 'Iglesia Cristiana Evangélica',
      texto: 'Diseño gráfico, edición de video, animación, desarrollo web y UX/UI aplicados a proyectos reales.',
    },
    {
      periodo: 'Abr 2022 – Actualidad',
      tipo: 'trabajo',
      titulo: 'Freelance: diseño y desarrollo web',
      lugar: 'Proyectos propios',
      texto: 'Llevo proyectos de punta a punta, desde la idea hasta el código.',
    },
    {
      periodo: 'Oct 2022',
      tipo: 'trabajo',
      titulo: 'UI Designer – UX Challenge',
      lugar: 'Universidad Maimónides',
      texto: 'Mi primera inmersión en UX/UI aplicada a un desafío real.',
    },
    {
      periodo: 'Dic 2022 – Feb 2023',
      tipo: 'trabajo',
      titulo: 'UI Designer – Gift Blame',
      lugar: 'Proyecto de producto digital',
      texto: 'Diseñé la interfaz de un producto digital completo, trabajando en equipo.',
    },
    {
      periodo: 'Mar 2024 – Jun 2024',
      tipo: 'trabajo',
      titulo: 'Ayudante de cátedra – Diseño de Interfaces',
      lugar: 'Universidad Maimónides',
      texto: 'Enseñar me hizo entender el diseño todavía mejor.',
    },
    {
      periodo: 'Sep 2024 – Dic 2024',
      tipo: 'logro',
      titulo: 'Diseñadora gráfica institucional',
      lugar: 'Universidad Maimónides',
      destacado: true,
      texto:
        'Creé los certificados de Illustrator y Photoshop para la universidad. Uno de ellos fue elegido ganador en una competencia por votación.',
    },
    {
      periodo: 'Ago 2025 – Nov 2025',
      tipo: 'trabajo',
      titulo: 'Ayudante de cátedra – Negocios Digitales II',
      lugar: 'Universidad Maimónides',
      texto: 'Lo digital también se trata de estrategia y de entender el negocio.',
    },
    {
      periodo: 'Mar 2026 – Actualidad',
      tipo: 'trabajo',
      titulo: 'Ayudante de cátedra – Marketing Digital',
      lugar: 'Universidad Maimónides',
      texto: 'Sumo la mirada de marketing a todo lo que diseño.',
    },
  ],
  habilidades: [
    {
      grupo: 'Diseño',
      version: 'pen-tool',
      items: [
        { texto: 'Photoshop', logo: 'photoshop' },
        { texto: 'Illustrator', logo: 'illustrator' },
        'Certificados institucionales',
      ],
    },
    {
      grupo: 'UX / UI',
      version: 'layout',
      items: [
        { texto: 'Figma', logo: 'figma' },
        'Experiencia de usuario',
        'Diseño de interfaces',
      ],
    },
    {
      grupo: 'Video',
      version: 'video',
      items: [
        { texto: 'Premiere', logo: 'premiere' },
        { texto: 'After Effects', logo: 'aftereffects' },
        'Animación',
      ],
    },
    {
      grupo: 'Desarrollo',
      version: 'codigo',
      items: [
        { texto: 'HTML', logo: 'html' },
        { texto: 'CSS', logo: 'css' },
        { texto: 'JavaScript', logo: 'javascript' },
        { texto: 'React', logo: 'react' },
      ],
    },
  ],
  certificaciones: [
    {
      nombre: 'Photoshop',
      descripcion: 'Certificado académico de Adobe Photoshop',
      imagen: '/img/certificaciones/photoshop.jpg',
    },
    {
      nombre: 'Illustrator',
      descripcion: 'Certificado académico de Adobe Illustrator',
      imagen: '/img/certificaciones/illustrator.jpg',
    },
    {
      nombre: 'Figma',
      descripcion: 'Certificado de diseño de interfaces con Figma',
      imagen: '/img/certificaciones/figma.jpg',
    },
    {
      nombre: 'Ayudantía en Negocios Digitales II',
      descripcion: 'Ayudantía en la materia Negocios Digitales II',
      imagen: '/img/certificaciones/negocios-digitales.png',
    },
    {
      nombre: 'Ayudantía en Diseño de Interfaces',
      descripcion: 'Ayudantía en la materia Diseño de Interfaces',
      imagen: '/img/certificaciones/diseno-de-interfaces.png',
    },
  ],
};