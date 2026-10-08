//panel de administracion: sirve para cargar, editar y borrar proyectos
//y para editar el perfil publico (foto, nombre, contacto y redes)
//tiene tres vistas: portada (tipo behance), proyecto (cargar/editar) y perfil
//se pide usuario y clave al entrar y las modificaciones se envian con esa clave
//la imagen se convierte a base64 y se guarda en la base junto al resto de los datos
import { useEffect, useState, useRef } from 'react';
import {
  obtenerProyectos,
  verificarClave,
  crearProyecto,
  actualizarProyecto,
  borrarProyecto,
} from '../api/proyectos.js';
import { obtenerServicios, crearServicio } from '../api/servicios.js';
import { obtenerPerfil, actualizarPerfil } from '../api/perfil.js';
import { obtenerConversaciones } from '../api/mensajes.js';
import { leerSesion, guardarSesion, borrarSesion } from '../api/sesionAdmin.js';
import {
  leerSesion as leerSesionUsuario,
  borrarSesion as borrarSesionUsuario,
  obtenerEmailDueno,
  linkPerfil,
} from '../api/usuarios.js';
import { comprimirImagen } from '../utils/imagen.js';
import AdminMensajes from './AdminMensajes.jsx';
import AdminProyectoCard from './AdminProyectoCard.jsx';
import Loading from './Loading.jsx';
import SelectorImagenes from './SelectorImagenes.jsx';

//mensaje de error para saber si el problema fue la clave (401) o algo mas
function claveIncorrecta(error) {
  return /401/.test(error.message);
}

//modal de confirmacion para borrar un proyecto (reemplaza al alert del navegador)
//se cierra con esc, con la x o tocando afuera; el foco vuelve al boton que lo abrio
function ModalEliminar({ proyecto, alConfirmar, alCancelar }) {
  const cancelarRef = useRef(null);

  //al abrir: se guarda el foco anterior, se enfoca el boton cancelar y se levanta la tecla esc
  useEffect(() => {
    const previo = document.activeElement;
    cancelarRef.current?.focus();
    function cerrarConEsc(evento) {
      if (evento.key === 'Escape') alCancelar();
    }
    window.addEventListener('keydown', cerrarConEsc);
    return () => {
      window.removeEventListener('keydown', cerrarConEsc);
      if (previo && previo.isConnected && previo.focus) previo.focus();
    };
    //alCancelar cambia en cada render pero aca solo interesa el cierre
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={alCancelar}
      aria-hidden={false}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-700 p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Eliminar proyecto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-white">Eliminar proyecto</h2>
        <p className="mt-2 text-zinc-400">
          ¿Borrar el proyecto "{proyecto.titulo}"? Esta acción no se puede deshacer.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            ref={cancelarRef}
            onClick={alCancelar}
            className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={alConfirmar}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium transition-colors cursor-pointer"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

//nombre del servicio a partir de su slug, para mostrar la categoría del proyecto
function nombreServicio(lista, slug) {
  return lista.find((s) => s.slug === slug)?.nombre ?? '';
}

//categorias de un proyecto: la lista nueva ("servicios") o la vieja ("servicio")
function categoriasDeProyecto(proyecto) {
  const lista = Array.isArray(proyecto.servicios) && proyecto.servicios.length
    ? proyecto.servicios
    : proyecto.servicio
      ? [proyecto.servicio]
      : [];
  return [...new Set(lista.map((s) => String(s).trim()).filter(Boolean))];
}

//agrupa los proyectos por categoria para la portada del panel
//un proyecto con varias categorias aparece en cada uno de sus grupos
function agruparProyectos(lista, listaServicios) {
  const grupos = [];
  const indices = new Map();
  for (const proyecto of lista) {
    const slugs = categoriasDeProyecto(proyecto);
    for (const slug of Array.from(slugs.length ? slugs : [''])) {
      const clave = slug || '__sin__';
      const nombre = nombreServicio(listaServicios, slug) || 'Sin categoría';
      if (!indices.has(clave)) {
        indices.set(clave, grupos.length);
        grupos.push({ slug, clave, nombre, proyectos: [] });
      }
      grupos[indices.get(clave)].proyectos.push(proyecto);
    }
  }
  grupos.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  return grupos;
}

//silueta de persona para cuando el perfil no tiene foto cargada
function SiluetaPersona({ className }) {
  return (
    <svg aria-hidden="true" className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zm0 2c-4.4 0-8 2-8 4v2h16v-2c0-2-3.6-4-8-4z" />
    </svg>
  );
}

//icono de lapiz para editar (la foto del perfil o un proyecto)
function IconoLapiz({ className }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

//icono de imagen para cambiar la foto de portada del banner
function IconoImagen({ className }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  );
}

//desplazamiento del carrusel con animacion: mueve el scroll con easing suave
//desactiva el snap mientras se mueve para que el cuadro no "pegue" ni corte el efecto
function desplazarSuave(contenedor, dir) {
  if (!contenedor) return;
  const paso = Math.max(260, contenedor.clientWidth * 0.75);
  const desde = contenedor.scrollLeft;
  const hasta = desde + dir * paso;
  const duracion = 550;
  const snapPrevio = contenedor.style.scrollSnapType;
  contenedor.style.scrollSnapType = 'none';
  const inicio = performance.now();
  function animar(ahora) {
    const progreso = Math.min((ahora - inicio) / duracion, 1);
    //ease-out cubico: arranca rapido y frena de a poco
    const suavizado = 1 - Math.pow(1 - progreso, 3);
    contenedor.scrollLeft = desde + (hasta - desde) * suavizado;
    if (progreso < 1) {
      requestAnimationFrame(animar);
    } else {
      contenedor.style.scrollSnapType = snapPrevio;
    }
  }
  requestAnimationFrame(animar);
}

//carrusel horizontal de una categoria con sus proyectos (flechas a los costados)
//las flechas se desactivan cuando no queda contenido para ese lado
function CarruselAdmin({ grupo, numero, alEditar, alEliminar }) {
  const ref = useRef(null);
  const [alInicio, setAlInicio] = useState(true);
  const [alFinal, setAlFinal] = useState(grupo.proyectos.length <= 1);

  //al scrollear se avisa si queda contenido a cada lado para (des)habilitar las flechas
  useEffect(() => {
    const contenedor = ref.current;
    if (!contenedor) return;
    const actualizar = () => {
      const tolerancia = 8;
      const fin = contenedor.scrollWidth - contenedor.clientWidth;
      setAlInicio(contenedor.scrollLeft <= tolerancia);
      setAlFinal(contenedor.scrollLeft >= fin - tolerancia);
    };
    actualizar();
    contenedor.addEventListener('scroll', actualizar);
    window.addEventListener('resize', actualizar);
    return () => {
      contenedor.removeEventListener('scroll', actualizar);
      window.removeEventListener('resize', actualizar);
    };
  }, [grupo.proyectos.length]);

  const claseFlecha = (desactivado) =>
    `shrink-0 self-center w-11 h-11 rounded-full bg-black/80 border border-zinc-700 text-zinc-200 transition-all duration-200 cursor-pointer ${
      desactivado
        ? 'opacity-40 cursor-not-allowed'
        : 'hover:scale-110 hover:bg-verde-app hover:text-black hover:border-verde-app active:scale-90 active:bg-violeta-app active:text-black active:border-violeta-app'
    }`;

  return (
    <section
      id={`admin-grupo-${numero}`}
      aria-labelledby={`admin-grupo-titulo-${numero}`}
      className="scroll-mt-36"
    >
      <h2 id={`admin-grupo-titulo-${numero}`} className="text-lg font-semibold text-white mb-4">
        {grupo.nombre}{' '}
        <span className="ml-1 text-sm font-normal text-zinc-500">({grupo.proyectos.length})</span>
      </h2>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => desplazarSuave(ref.current, -1)}
          disabled={alInicio}
          aria-label={`Ver proyectos anteriores de ${grupo.nombre}`}
          className={claseFlecha(alInicio)}
        >
          <span aria-hidden="true">←</span>
        </button>
        <div className="flex-1 min-w-0">
          <ul ref={ref} className="flex gap-4 overflow-x-auto snap-x pb-3 carrusel-scroll">
            {grupo.proyectos.map((proyecto) => (
              <li key={proyecto._id} className="shrink-0 snap-start w-60">
                <AdminProyectoCard
                  proyecto={proyecto}
                  grupoNombre={grupo.nombre}
                  alEditar={alEditar}
                  alEliminar={alEliminar}
                />
              </li>
            ))}
          </ul>
        </div>
        <button
          type="button"
          onClick={() => desplazarSuave(ref.current, 1)}
          disabled={alFinal}
          aria-label={`Ver más proyectos de ${grupo.nombre}`}
          className={claseFlecha(alFinal)}
        >
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </section>
  );
}

export default function AdminProyectos() {
  const [usuario, setUsuario] = useState('');
  const [clave, setClave] = useState('');
  const [sesion, setSesion] = useState(false);
  const [cargandoSesion, setCargandoSesion] = useState(false);
  //marcan en rojo el campo del login que no coincide (usuario y/o clave)
  const [errorUsuario, setErrorUsuario] = useState(false);
  const [errorClave, setErrorClave] = useState(false);

  //vista actual del panel: portada (tipo behance) | proyecto (cargar/editar) | perfil
  const [vista, setVista] = useState('portada');
  //categoria elegida en el menu superior (clave del grupo); vacio = mostrar todas
  const [categoriaActiva, setCategoriaActiva] = useState('');
  //cantidad de personas que escribieron, para el contador del icono de mensajes
  const [cantidadConversaciones, setCantidadConversaciones] = useState(0);

  const [proyectos, setProyectos] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [titulo, setTitulo] = useState('');
  const [resumen, setResumen] = useState('');
  const [link, setLink] = useState('');
  const [video, setVideo] = useState('');
  //categorias elegidas del proyecto (pueden ser varias: aparece en todas)
  const [serviciosSel, setServiciosSel] = useState([]);
  const [usarCategoriaNueva, setUsarCategoriaNueva] = useState(false);
  const [nuevaNombre, setNuevaNombre] = useState('');
  const [nuevaDescripcion, setNuevaDescripcion] = useState('');
  const [imagenes, setImagenes] = useState([]);
  const [destacado, setDestacado] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [guardando, setGuardando] = useState(false);
  //proyecto que espera confirmacion antes de borrarse (para el modal)
  const [proyectoAEliminar, setProyectoAEliminar] = useState(null);

  //perfil publico (lo usa la portada del panel y los campos del formulario de perfil)
  const [perfil, setPerfil] = useState(null);
  const [pFoto, setPFoto] = useState('');
  const [pNombre, setPNombre] = useState('');
  const [pTitulo, setPTitulo] = useState('');
  const [pSobreMi, setPSobreMi] = useState('');
  const [pEmail, setPEmail] = useState('');
  const [pTelefono, setPTelefono] = useState('');
  const [pWhatsapp, setPWhatsapp] = useState('');
  const [pLinkedin, setPLinkedin] = useState('');
  const [pInstagram, setPInstagram] = useState('');
  const [pThreads, setPThreads] = useState('');
  const [pBehance, setPBehance] = useState('');
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  //input de foto oculto: lo disparan el lapiz del avatar y el del formulario de perfil
  const fotoInputRef = useRef(null);
  const portadaInputRef = useRef(null);

  const [listaServicios, setListaServicios] = useState([]);
  const [mensaje, setMensaje] = useState(null);

  //al entrar: si ya hay sesion guardada (por ejemplo desde el detalle de un proyecto) se reusa.
  //si no, la dueña puede abrir el panel con su cuenta de "mi cuenta" (sesion de firebase)
  useEffect(() => {
    const sesion = leerSesion();
    if (sesion) {
      setSesion(true);
      setClave(sesion.clave);
      setUsuario(sesion.usuario);
      cargarProyectos();
      cargarPerfil();
      cargarCantidadConversaciones();
    } else {
      obtenerEmailDueno()
        .then((email) => {
          const cuenta = leerSesionUsuario();
          const esDueno =
            cuenta?.token &&
            (cuenta.email ?? '').toLowerCase() === (email ?? '').toLowerCase();
          if (esDueno) {
            //la sesion de la dueña se manda sola (las peticiones usan su token, sin clave)
            setSesion(true);
            setUsuario(cuenta.email);
            cargarProyectos();
            cargarPerfil();
            cargarCantidadConversaciones();
          }
        })
        .catch(() => {});
    }
    obtenerServicios()
      .then((lista) => setListaServicios(lista))
      .catch(() => {});
  }, []);

  function mostrarMensaje(texto, tipo = 'ok') {
    setMensaje({ texto, tipo });
  }

  //trae cuantas personas escribieron, para el contador del icono de mensajes
  function cargarCantidadConversaciones() {
    obtenerConversaciones(clave)
      .then((lista) => setCantidadConversaciones(lista.length))
      .catch(() => {});
  }

  function cargarProyectos() {
    setCargando(true);
    obtenerProyectos()
      .then(setProyectos)
      .catch((error) => mostrarMensaje(error.message, 'error'))
      .finally(() => setCargando(false));
  }

  //trae el perfil y carga todos los campos del formulario de perfil
  function cargarPerfil() {
    obtenerPerfil()
      .then((p) => {
        setPerfil(p);
        setPFoto(p.foto ?? '');
        setPNombre(p.nombre ?? '');
        setPTitulo(p.titulo ?? '');
        setPSobreMi(p.sobreMi ?? '');
        setPEmail(p.email ?? '');
        setPTelefono(p.telefono ?? '');
        setPWhatsapp(p.whatsapp ?? '');
        setPLinkedin(p.redes?.linkedin ?? '');
        setPInstagram(p.redes?.instagram ?? '');
        setPThreads(p.redes?.threads ?? '');
        setPBehance(p.redes?.behance ?? '');
      })
      .catch(() => {});
  }

  async function iniciarSesion(evento) {
    evento.preventDefault();
    setCargandoSesion(true);
    setMensaje(null);
    setErrorUsuario(false);
    setErrorClave(false);
    try {
      await verificarClave(usuario.trim(), clave.trim());
      guardarSesion(usuario.trim(), clave.trim());
      setSesion(true);
      setVista('portada');
      cargarProyectos();
      cargarPerfil();
      cargarCantidadConversaciones();
    } catch (error) {
      //el servidor avisa cual de los dos campos no coincide para marcarlo en rojo
      setErrorUsuario(error.campos?.usuario === false);
      setErrorClave(error.campos?.clave === false);
      mostrarMensaje(error.message, 'error');
    } finally {
      setCargandoSesion(false);
    }
  }

  function salir() {
    borrarSesion();
    borrarSesionUsuario();
    setSesion(false);
    setUsuario('');
    setClave('');
    setProyectos([]);
    resetearFormulario();
    setVista('portada');
    setMensaje(null);
  }

  function resetearFormulario() {
    setTitulo('');
    setResumen('');
    setLink('');
    setVideo('');
    setServiciosSel([]);
    setUsarCategoriaNueva(false);
    setNuevaNombre('');
    setNuevaDescripcion('');
    setImagenes([]);
    setDestacado(false);
    setEditandoId(null);
  }

  //va a la vista de cargar/editar proyecto con el formulario vacio
  function irAAgregarProyecto() {
    resetearFormulario();
    setMensaje(null);
    setVista('proyecto');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  //llena el formulario con un proyecto existente y abre la vista de proyecto
  function editarProyecto(proyecto) {
    setEditandoId(proyecto._id);
    setTitulo(proyecto.titulo ?? '');
    setResumen(proyecto.resumen ?? '');
    setLink(proyecto.link ?? '');
    setVideo(proyecto.video ?? '');
    setServiciosSel(categoriasDeProyecto(proyecto));
    setUsarCategoriaNueva(false);
    setNuevaNombre('');
    setNuevaDescripcion('');
    setImagenes([proyecto.imagen, ...(proyecto.imagenes ?? [])].filter(Boolean));
    setDestacado(!!proyecto.destacado);
    setMensaje(null);
    setVista('proyecto');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  //marca o desmarca una categoria en la lista del proyecto
  function alternarCategoria(slug) {
    setServiciosSel((previo) =>
      previo.includes(slug) ? previo.filter((s) => s !== slug) : [...previo, slug]
    );
  }

  async function guardarProyecto(evento) {
    evento.preventDefault();
    if (!titulo.trim()) {
      mostrarMensaje('El título es obligatorio', 'error');
      return;
    }
    setGuardando(true);
    setMensaje(null);
    let listaServicios = serviciosSel;
    //si se pide crear categoria nueva, se crea o se reusa una con ese nombre y se agrega a la lista
    if (usarCategoriaNueva) {
      if (!nuevaNombre.trim()) {
        mostrarMensaje('Escribí el nombre de la categoría nueva', 'error');
        setGuardando(false);
        return;
      }
      const creado = await crearServicio(nuevaNombre.trim(), nuevaDescripcion.trim(), clave);
      const slugNuevo = creado.datos.slug;
      listaServicios = [...new Set([...serviciosSel, slugNuevo])];
      obtenerServicios()
        .then((lista) => setListaServicios(lista))
        .catch(() => {});
    }
    //la primera imagen del formulario es la portada y el resto la galeria del detalle
    const datos = {
      titulo: titulo.trim(),
      resumen: resumen.trim(),
      servicios: listaServicios,
      imagen: imagenes[0] ?? '',
      imagenes: imagenes.slice(1),
      link: link.trim(),
      video: video.trim(),
      destacado,
    };
    try {
      if (editandoId) {
        await actualizarProyecto(editandoId, datos, clave);
        mostrarMensaje('Proyecto actualizado');
      } else {
        await crearProyecto(datos, clave);
        mostrarMensaje('Proyecto creado');
      }
      resetearFormulario();
      cargarProyectos();
      //al terminar se vuelve a la portada con los proyectos actualizados
      setVista('portada');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      if (claveIncorrecta(error)) {
        mostrarMensaje('La sesión expiró. Volvé a entrar.', 'error');
        salir();
      } else {
        mostrarMensaje(error.message, 'error');
      }
    } finally {
      setGuardando(false);
    }
  }

  //abre el selector de archivos para cargar la foto de perfil
  function abrirElegirFoto() {
    fotoInputRef.current?.click();
  }

  //al elegir una imagen se comprime, se guarda en la base y se actualiza el perfil
  async function cambiarFoto(evento) {
    const archivo = evento.target.files?.[0];
    evento.target.value = '';
    if (!archivo) return;
    setGuardandoPerfil(true);
    setMensaje(null);
    try {
      const base64 = await comprimirImagen(archivo);
      const respuesta = await actualizarPerfil({ foto: base64 }, clave);
      const datos = respuesta.datos ?? { ...(perfil ?? {}), foto: base64 };
      setPerfil(datos);
      setPFoto(datos.foto ?? '');
      mostrarMensaje('Foto de perfil actualizada');
      window.dispatchEvent(new CustomEvent('perfil-actualizado'));
    } catch (error) {
      if (claveIncorrecta(error)) {
        mostrarMensaje('La sesión expiró. Volvé a entrar.', 'error');
        salir();
      } else {
        mostrarMensaje(error.message, 'error');
      }
    } finally {
      setGuardandoPerfil(false);
    }
  }

  //abre el selector de archivos para cargar la foto de portada del banner
  function abrirElegirPortada() {
    portadaInputRef.current?.click();
  }

  //al elegir una imagen se comprime, se guarda en la base y se actualiza el banner
  async function cambiarPortada(evento) {
    const archivo = evento.target.files?.[0];
    evento.target.value = '';
    if (!archivo) return;
    setGuardandoPerfil(true);
    setMensaje(null);
    try {
      const base64 = await comprimirImagen(archivo);
      const respuesta = await actualizarPerfil({ portada: base64 }, clave);
      const datos = respuesta.datos ?? { ...(perfil ?? {}), portada: base64 };
      setPerfil(datos);
      mostrarMensaje('Foto de portada actualizada');
      window.dispatchEvent(new CustomEvent('perfil-actualizado'));
    } catch (error) {
      if (claveIncorrecta(error)) {
        mostrarMensaje('La sesión expiró. Volvé a entrar.', 'error');
        salir();
      } else {
        mostrarMensaje(error.message, 'error');
      }
    } finally {
      setGuardandoPerfil(false);
    }
  }

  //entrar a la vista de editar perfil con los ultimos datos guardados
  function irAEditarPerfil() {
    setMensaje(null);
    cargarPerfil();
    setVista('perfil');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  //entrar a la vista de mensajes y refrescar el contador del icono
  function irAMensajes() {
    setMensaje(null);
    setVista('mensajes');
    cargarCantidadConversaciones();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  //filtra el menu superior: muestra solo los carruseles de esa categoria
  //si ya estaba elegida se destilde y vuelve a mostrar todas
  function elegirCategoria(clave) {
    setCategoriaActiva((actual) => (actual === clave ? '' : clave));
  }

  //deshace el filtro al actualizar los proyectos si la categoria ya no existe
  useEffect(() => {
    if (categoriaActiva && !grupos.some((g) => g.clave === categoriaActiva)) {
      setCategoriaActiva('');
    }
    //grupos cambia en cada render, solo interesa la categoria
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proyectos]);

  //guarda todos los campos del formulario de perfil
  async function guardarPerfil(evento) {
    evento.preventDefault();
    setGuardandoPerfil(true);
    setMensaje(null);
    const datos = {
      nombre: pNombre.trim(),
      titulo: pTitulo.trim(),
      sobreMi: pSobreMi.trim(),
      foto: pFoto,
      email: pEmail.trim(),
      telefono: pTelefono.trim(),
      whatsapp: pWhatsapp.trim(),
      redes: {
        linkedin: pLinkedin.trim(),
        instagram: pInstagram.trim(),
        threads: pThreads.trim(),
        behance: pBehance.trim(),
      },
    };
    try {
      const respuesta = await actualizarPerfil(datos, clave);
      setPerfil(respuesta.datos ?? null);
      setPFoto(respuesta.datos?.foto ?? '');
      mostrarMensaje('Perfil actualizado');
      window.dispatchEvent(new CustomEvent('perfil-actualizado'));
      setVista('portada');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      if (claveIncorrecta(error)) {
        mostrarMensaje('La sesión expiró. Volvé a entrar.', 'error');
        salir();
      } else {
        mostrarMensaje(error.message, 'error');
      }
    } finally {
      setGuardandoPerfil(false);
    }
  }

  //borra el proyecto que pidio confirmacion en el modal
  async function ejecutarBorrar() {
    if (!proyectoAEliminar) return;
    const unProyecto = proyectoAEliminar;
    setProyectoAEliminar(null);
    setMensaje(null);
    try {
      await borrarProyecto(unProyecto._id, clave);
      if (editandoId === unProyecto._id) resetearFormulario();
      mostrarMensaje('Proyecto borrado');
      cargarProyectos();
    } catch (error) {
      if (claveIncorrecta(error)) {
        mostrarMensaje('La sesión expiró. Volvé a entrar.', 'error');
        salir();
      } else {
        mostrarMensaje(error.message, 'error');
      }
    }
  }

  const claseInput =
    'w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-verde-app transition-all';
  //igual que claseInput pero con el borde rojo para marcar el campo del login que fallo
  const claseCampoLoginError =
    'w-full px-4 py-2 bg-zinc-900 border border-red-500 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all';
  const claseBoton =
    'px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
  const claseBotonPrimario = `${claseBoton} bg-violeta-app hover:bg-violeta-app/90 text-black`;
  const claseBotonSecundario = `${claseBoton} bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700`;
  //chip del menu superior: el de la categoria elegida queda verde
  const claseChip = (activo) =>
    `px-3 py-1 rounded-full text-sm border transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95 ${
      activo
        ? 'bg-verde-app text-black border-verde-app'
        : 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:border-verde-app/50'
    }`;

  //entrada al panel: pide usuario y clave
  if (!sesion) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <form onSubmit={iniciarSesion} className="space-y-4 p-6 rounded-2xl bg-zinc-900 border border-zinc-800">
          <h1 className="text-2xl font-bold text-white">Panel de administración</h1>
          <p className="text-sm text-zinc-400">Ingresá tu usuario y contraseña para gestionar tus proyectos y tu perfil.</p>
          <input
            type="text"
            value={usuario}
            onChange={(e) => {
              setUsuario(e.target.value);
              setErrorUsuario(false);
            }}
            placeholder="Usuario"
            aria-label="Usuario de administrador"
            aria-invalid={errorUsuario}
            autoComplete="username"
            className={errorUsuario ? claseCampoLoginError : claseInput}
          />
          <input
            type="password"
            value={clave}
            onChange={(e) => {
              setClave(e.target.value);
              setErrorClave(false);
            }}
            placeholder="Contraseña"
            aria-label="Contraseña de administrador"
            aria-invalid={errorClave}
            autoComplete="current-password"
            className={errorClave ? claseCampoLoginError : claseInput}
          />
          <button
            type="submit"
            disabled={cargandoSesion || !usuario.trim() || !clave.trim()}
            className={`${claseBotonPrimario} w-full disabled:bg-zinc-800`}
          >
            {cargandoSesion ? 'Verificando...' : 'Entrar'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-zinc-400">
          ¿Sos la dueña del sitio?{' '}
          <a
            href={linkPerfil()}
            className="inline-block font-medium text-verde-app rounded-lg px-2 py-1 hover:bg-verde-app/10 hover:text-verde-app/80 active:scale-95 hover:scale-105 transition-all duration-200"
          >
            Entrá con tu cuenta en "Perfil"
          </a>{' '}
          y el panel se abre solo.
        </p>
      </div>
    );
  }

  const grupos = agruparProyectos(proyectos, listaServicios);
  const fotoPerfil = perfil?.foto;
  const fotoPortada = perfil?.portada;

  //si la categoria elegida ya no existe (por ejemplo se borro el ultimo proyecto), se muestra todo
  const categoriaValida =
    categoriaActiva && grupos.some((g) => g.clave === categoriaActiva) ? categoriaActiva : '';
  const gruposVisibles = categoriaValida ? grupos.filter((g) => g.clave === categoriaValida) : grupos;

  return (
    <section aria-label="Administración" className="max-w-6xl mx-auto px-4 py-8">
      {/*input de foto oculto: lo abre el lapiz del avatar o del formulario de perfil*/}
      <input
        ref={fotoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={cambiarFoto}
        tabIndex={-1}
        aria-hidden="true"
      />
      {/*input de portada oculto: lo abre el boton del banner*/}
      <input
        ref={portadaInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={cambiarPortada}
        tabIndex={-1}
        aria-hidden="true"
      />

      {mensaje && (
        <p
          role={mensaje.tipo === 'error' ? 'alert' : 'status'}
          className={`mb-6 text-sm px-4 py-2 rounded-lg border ${
            mensaje.tipo === 'error'
              ? 'text-red-400 border-red-500/30 bg-red-500/10'
              : 'text-green-400 border-green-500/30 bg-green-500/10'
          }`}
        >
          {mensaje.texto}
        </p>
      )}

      <div className="flex flex-col lg:flex-row gap-8">
        {/*menu lateral: navegacion entre las vistas del panel*/}
        <aside className="lg:w-56 shrink-0" aria-label="Menú del panel">
          <nav className="lg:sticky lg:top-24 space-y-1">
            {[
              {
                etiqueta: 'Portada',
                accion: () => setVista('portada'),
                activo: vista === 'portada',
                icono: (
                  <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                ),
              },
              {
                etiqueta: 'Agregar proyecto',
                accion: irAAgregarProyecto,
                activo: vista === 'proyecto' && !editandoId,
                icono: (
                  <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M5 12h14" />
                    <path d="M12 5v14" />
                  </svg>
                ),
              },
              {
                etiqueta: 'Editar perfil',
                accion: irAEditarPerfil,
                activo: vista === 'perfil',
                icono: (
                  <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                ),
              },
              {
                etiqueta: 'Mensajes',
                accion: irAMensajes,
                activo: vista === 'mensajes',
                cantidad: cantidadConversaciones,
                icono: (
                  <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="m22 2-7 20-4-9-9-4Z" />
                    <path d="M22 2 11 13" />
                  </svg>
                ),
              },
            ].map((item) => (
              <button
                key={item.etiqueta}
                type="button"
                onClick={item.accion}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                  item.activo
                    ? 'bg-violeta-app text-black font-medium'
                    : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                }`}
              >
                {item.icono}
                <span className="flex-1 text-left">{item.etiqueta}</span>
                {item.cantidad > 0 && (
                  <span className="shrink-0 text-xs px-2 py-0.5 rounded-full font-medium bg-verde-app text-black">
                    {item.cantidad}
                  </span>
                )}
              </button>
            ))}
            <div className="pt-3 mt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={salir}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer"
              >
                <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" x2="9" y1="12" y2="12" />
                </svg>
                Salir
              </button>
            </div>
          </nav>
        </aside>

        {/*vista seleccionada del panel*/}
        <div className="flex-1 min-w-0 space-y-8">
          {vista === 'portada' && (
            <>
              {/*portada tipo behance: cabecera con foto de perfil y boton para sumar proyectos*/}
              <header className="rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900">
                <div className="relative h-32">
                  {fotoPortada ? (
                    <img src={fotoPortada} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div
                      className="w-full h-full bg-gradient-to-r from-verde-app/20 via-violeta-app/20 to-zinc-800"
                      aria-hidden="true"
                    />
                  )}
                  {/*boton para cambiar la foto de portada del banner*/}
                  <button
                    type="button"
                    onClick={abrirElegirPortada}
                    disabled={guardandoPerfil}
                    aria-label="Cambiar foto de portada"
                    title="Cambiar foto de portada"
                    className="absolute top-3 right-3 inline-flex items-center justify-center w-9 h-9 rounded-full bg-black/70 backdrop-blur-md border border-zinc-700 text-zinc-300 hover:text-white hover:border-verde-app hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <IconoImagen className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-end justify-between px-4 sm:px-6 -mt-12 pb-4">
                  <div className="flex items-end gap-3 sm:gap-4 min-w-0">
                    <div className="relative shrink-0">
                      <div className="w-20 sm:w-24 h-20 sm:h-24 rounded-full overflow-hidden bg-zinc-800 border-4 border-black flex items-center justify-center text-zinc-500">
                        {fotoPerfil ? (
                          <img src={fotoPerfil} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <SiluetaPersona className="w-10 h-10 sm:w-12 sm:h-12" />
                        )}
                      </div>
                      {/*lapiz sobre el avatar: cambia la foto de perfil al instante*/}
                      <button
                        type="button"
                        onClick={abrirElegirFoto}
                        disabled={guardandoPerfil}
                        aria-label="Cambiar foto de perfil"
                        title="Cambiar foto de perfil"
                        className="absolute -bottom-1 -right-1 inline-flex items-center justify-center w-8 h-8 rounded-full bg-violeta-app text-black hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <IconoLapiz className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="min-w-0 pb-1">
                      <h1 className="text-xl sm:text-2xl font-bold text-white truncate">
                        {perfil?.nombre || 'Agustina Ferraro'}
                      </h1>
                      <p className="text-sm text-zinc-400 truncate">
                        {perfil?.titulo || 'Diseñadora Multimedia & Desarrolladora Full Stack'}
                      </p>
                    </div>
                  </div>
                </div>
              </header>

              {/*menu superior: chips para filtrar por categoria (solo aparece la categoria elegida)*/}
              {!cargando && proyectos.length > 0 && (
                <div className="space-y-3">
                  <div className="sticky top-16 z-20 -mx-4 px-4 py-2 bg-black/90 backdrop-blur-md border-b border-zinc-800">
                    <ul
                      className="flex gap-2 overflow-x-auto carrusel-scroll py-2"
                      aria-label="Filtrar proyectos por categoría"
                      role="group"
                    >
                      <li className="shrink-0">
                        <button
                          type="button"
                          onClick={() => setCategoriaActiva('')}
                          aria-pressed={categoriaValida === ''}
                          className={claseChip(categoriaValida === '')}
                        >
                          Todas <span className="opacity-70">({proyectos.length})</span>
                        </button>
                      </li>
                      {grupos.map((grupo) => (
                        <li key={grupo.clave} className="shrink-0">
                          <button
                            type="button"
                            onClick={() => elegirCategoria(grupo.clave)}
                            aria-pressed={categoriaValida === grupo.clave}
                            className={claseChip(categoriaValida === grupo.clave)}
                          >
                            {grupo.nombre} <span className="opacity-70">({grupo.proyectos.length})</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/*btn de agregar proyecto justo debajo del menu de filtros, redondo*/}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={irAAgregarProyecto}
                      aria-label="Agregar proyecto"
                      title="Agregar proyecto"
                      className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-violeta-app hover:bg-violeta-app/90 text-black hover:scale-105 active:scale-95 transition-all cursor-pointer"
                    >
                      <svg aria-hidden="true" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <path d="M5 12h14" />
                        <path d="M12 5v14" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {/*proyectos como carruseles horizontales por categoria (similar a behance)
                  con filtro: si hay una categoria elegida solo aparece esa*/}
              <div key={categoriaValida || 'todas'} className="space-y-10 animacion-aparecer">
                {cargando ? (
                  <Loading claseContenedor="h-48" />
                ) : proyectos.length === 0 ? (
                  <div className="p-10 rounded-2xl bg-zinc-900 border border-zinc-800 text-center space-y-4">
                    <p className="text-zinc-400">Todavía no cargaste ningún proyecto.</p>
                    <button
                      type="button"
                      onClick={irAAgregarProyecto}
                      className={`${claseBotonPrimario} inline-flex items-center gap-2`}
                    >
                      <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <path d="M5 12h14" />
                        <path d="M12 5v14" />
                      </svg>
                      Agregar el primero
                    </button>
                  </div>
                ) : (
                  gruposVisibles.map((grupo, numero) => (
                    <CarruselAdmin
                      key={grupo.clave}
                      grupo={grupo}
                      numero={numero}
                      alEditar={editarProyecto}
                      alEliminar={setProyectoAEliminar}
                    />
                  ))
                )}
              </div>
            </>
          )}

          {vista === 'proyecto' && (
            <form onSubmit={guardarProyecto} className="space-y-4 p-6 rounded-2xl bg-zinc-900 border border-zinc-800">
              <h2 className="text-lg font-semibold text-white">
                {editandoId ? 'Editar proyecto' : 'Cargar un proyecto nuevo'}
              </h2>

              <div className="space-y-1">
                <label htmlFor="admin-titulo" className="block text-sm text-zinc-300">
                  Título *
                </label>
                <input
                  id="admin-titulo"
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Nombre del proyecto"
                  className={claseInput}
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="admin-resumen" className="block text-sm text-zinc-300">
                  Descripción (opcional)
                </label>
                <textarea
                  id="admin-resumen"
                  value={resumen}
                  onChange={(e) => setResumen(e.target.value)}
                  placeholder="Contá de qué se trata el proyecto..."
                  rows={4}
                  className={`${claseInput} resize-y`}
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="admin-link" className="block text-sm text-zinc-300">
                  Link del proyecto (opcional, para el botón "Ver detalle")
                </label>
                <input
                  id="admin-link"
                  type="text"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://www.behance.net/gallery/..."
                  className={claseInput}
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="admin-video" className="block text-sm text-zinc-300">
                  Video para el hero de la home (opcional, URL directa .mp4)
                </label>
                <input
                  id="admin-video"
                  type="text"
                  value={video}
                  onChange={(e) => setVideo(e.target.value)}
                  placeholder="https://algo.com/video.mp4"
                  className={claseInput}
                />
              </div>

              <label htmlFor="admin-destacado" className="flex items-center gap-3 text-sm text-zinc-300 cursor-pointer">
                <input
                  id="admin-destacado"
                  type="checkbox"
                  checked={destacado}
                  onChange={(e) => setDestacado(e.target.checked)}
                  className="w-4 h-4 accent-verde-app cursor-pointer"
                />
                Destacado en la portada
              </label>

              <div className="space-y-1">
                <label className="block text-sm text-zinc-300">
                  Categorías / servicios
                </label>
                {/*un proyecto puede estar en varias categorías (aparece en todas)*/}
                <ul className="grid gap-2 sm:grid-cols-2">
                  {listaServicios.map((s) => {
                    const marcado = serviciosSel.includes(s.slug);
                    return (
                      <li key={s.slug}>
                        <label
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-all duration-200 ${
                            marcado
                              ? 'bg-verde-app/10 border-verde-app/40 text-white'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={marcado}
                            onChange={() => alternarCategoria(s.slug)}
                            className="w-4 h-4 accent-verde-app cursor-pointer shrink-0"
                          />
                          <span className="flex-1">{s.nombre}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
                <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer pt-2">
                  <input
                    type="checkbox"
                    checked={usarCategoriaNueva}
                    onChange={(e) => setUsarCategoriaNueva(e.target.checked)}
                    className="w-4 h-4 accent-verde-app cursor-pointer"
                  />
                  Crear categoría nueva
                </label>
                <p className="text-xs text-zinc-600">
                  Si no tildás ninguna, el proyecto queda "Sin categoría".
                </p>
              </div>

              {usarCategoriaNueva && (
                <div className="space-y-3 rounded-xl border border-verde-app/30 bg-verde-app/5 p-4">
                  <div className="space-y-1">
                    <label htmlFor="admin-nueva-nombre" className="block text-sm text-zinc-300">
                      Nombre de la categoría nueva *
                    </label>
                    <input
                      id="admin-nueva-nombre"
                      type="text"
                      value={nuevaNombre}
                      onChange={(e) => setNuevaNombre(e.target.value)}
                      placeholder="Ej: Fotografía"
                      className={claseInput}
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="admin-nueva-desc" className="block text-sm text-zinc-300">
                      Descripción breve (opcional)
                    </label>
                    <input
                      id="admin-nueva-desc"
                      type="text"
                      value={nuevaDescripcion}
                      onChange={(e) => setNuevaDescripcion(e.target.value)}
                      placeholder="De qué se trata esta categoría"
                      className={claseInput}
                    />
                  </div>
                  <p className="text-xs text-zinc-500">
                    La categoría queda guardada y se puede usar en otros proyectos. Su página propia se suma con la próxima actualización de la web.
                  </p>
                </div>
              )}

              <div className="space-y-1">
                <label htmlFor="admin-imagen" className="block text-sm text-zinc-300">
                  Imágenes del proyecto
                </label>
                <SelectorImagenes imagenes={imagenes} alCambiar={setImagenes} mostrarMensaje={mostrarMensaje} />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={guardando}
                  className={claseBotonPrimario}
                >
                  {guardando ? 'Guardando...' : editandoId ? 'Guardar cambios' : 'Guardar proyecto'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetearFormulario();
                    setMensaje(null);
                    setVista('portada');
                  }}
                  className={claseBotonSecundario}
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {vista === 'perfil' && (
            <form onSubmit={guardarPerfil} className="space-y-4 p-6 rounded-2xl bg-zinc-900 border border-zinc-800">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">Editar perfil</h2>
                  <p className="text-sm text-zinc-500 mt-1">
                    Los cambios se ven solos en la web (contacto, pie de página y avatar), no hace falta actualizar el código.
                  </p>
                </div>
                <div className="relative shrink-0">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-500">
                    {pFoto ? (
                      <img src={pFoto} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <SiluetaPersona className="w-10 h-10" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={abrirElegirFoto}
                    disabled={guardandoPerfil}
                    aria-label="Cambiar foto de perfil"
                    title="Cambiar foto de perfil"
                    className="absolute -bottom-1 -right-1 inline-flex items-center justify-center w-8 h-8 rounded-full bg-violeta-app text-black hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <IconoLapiz className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="admin-perfil-nombre" className="block text-sm text-zinc-300">
                    Nombre
                  </label>
                  <input
                    id="admin-perfil-nombre"
                    type="text"
                    value={pNombre}
                    onChange={(e) => setPNombre(e.target.value)}
                    placeholder="Tu nombre y apellido"
                    className={claseInput}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="admin-perfil-titulo" className="block text-sm text-zinc-300">
                    Título
                  </label>
                  <input
                    id="admin-perfil-titulo"
                    type="text"
                    value={pTitulo}
                    onChange={(e) => setPTitulo(e.target.value)}
                    placeholder="Ej: Diseñadora Multimedia"
                    className={claseInput}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="admin-perfil-sobre-mi" className="block text-sm text-zinc-300">
                  Sobre mí
                </label>
                <textarea
                  id="admin-perfil-sobre-mi"
                  value={pSobreMi}
                  onChange={(e) => setPSobreMi(e.target.value)}
                  placeholder="Contá quién sos..."
                  rows={4}
                  className={`${claseInput} resize-y`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="admin-perfil-email" className="block text-sm text-zinc-300">
                    Email
                  </label>
                  <input
                    id="admin-perfil-email"
                    type="email"
                    value={pEmail}
                    onChange={(e) => setPEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className={claseInput}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="admin-perfil-telefono" className="block text-sm text-zinc-300">
                    Teléfono (para mostrar)
                  </label>
                  <input
                    id="admin-perfil-telefono"
                    type="tel"
                    value={pTelefono}
                    onChange={(e) => setPTelefono(e.target.value)}
                    placeholder="+54 9 11 3166-6948"
                    className={claseInput}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="admin-perfil-whatsapp" className="block text-sm text-zinc-300">
                  WhatsApp (número con código de país, para el link de wa.me)
                </label>
                <input
                  id="admin-perfil-whatsapp"
                  type="tel"
                  value={pWhatsapp}
                  onChange={(e) => setPWhatsapp(e.target.value)}
                  placeholder="5491131166948"
                  className={claseInput}
                />
                <p className="text-xs text-zinc-600">
                  Se usa en el botón de WhatsApp del formulario de contacto y en el pie de página.
                </p>
              </div>

              <div className="space-y-3">
                <p className="text-sm text-zinc-300">Redes sociales (opcional, cada una aparece si tiene link)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="admin-perfil-linkedin" className="block text-sm text-zinc-400">
                      LinkedIn
                    </label>
                    <input
                      id="admin-perfil-linkedin"
                      type="url"
                      value={pLinkedin}
                      onChange={(e) => setPLinkedin(e.target.value)}
                      placeholder="https://linkedin.com/in/..."
                      className={claseInput}
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="admin-perfil-instagram" className="block text-sm text-zinc-400">
                      Instagram
                    </label>
                    <input
                      id="admin-perfil-instagram"
                      type="url"
                      value={pInstagram}
                      onChange={(e) => setPInstagram(e.target.value)}
                      placeholder="https://instagram.com/..."
                      className={claseInput}
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="admin-perfil-threads" className="block text-sm text-zinc-400">
                      Threads
                    </label>
                    <input
                      id="admin-perfil-threads"
                      type="url"
                      value={pThreads}
                      onChange={(e) => setPThreads(e.target.value)}
                      placeholder="https://threads.net/@..."
                      className={claseInput}
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="admin-perfil-behance" className="block text-sm text-zinc-400">
                      Behance
                    </label>
                    <input
                      id="admin-perfil-behance"
                      type="url"
                      value={pBehance}
                      onChange={(e) => setPBehance(e.target.value)}
                      placeholder="https://behance.net/..."
                      className={claseInput}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button type="submit" disabled={guardandoPerfil} className={claseBotonPrimario}>
                  {guardandoPerfil ? 'Guardando...' : 'Guardar perfil'}
                </button>
                <button
                  type="button"
                  onClick={() => setVista('portada')}
                  className={claseBotonSecundario}
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {vista === 'mensajes' && (
            <AdminMensajes clave={clave} nombre={perfil?.nombre} alCambiar={cargarCantidadConversaciones} />
          )}
        </div>
      </div>

      {proyectoAEliminar && (
        <ModalEliminar
          proyecto={proyectoAEliminar}
          alConfirmar={ejecutarBorrar}
          alCancelar={() => setProyectoAEliminar(null)}
        />
      )}
    </section>
  );
}