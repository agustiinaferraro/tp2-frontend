import { useEffect, useRef, useState } from "react";
import { paginasBusqueda } from "../data/busqueda.js";
import { obtenerProyectosLigeros } from "../api/proyectos.js";
import { obtenerServicios } from "../api/servicios.js";

//normaliza el texto para buscar sin acentos ni mayusculas
function normalizar(texto) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

//buscador de la interfaz: filtra paginas, servicios y proyectos desde cualquier pagina
export default function Buscador() {
  const [consulta, setConsulta] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [proyectos, setProyectos] = useState([]);
  const [servicios, setServicios] = useState([]);
  const contenedor = useRef(null);
  const datosCargados = useRef(false);

  //pide los proyectos y servicios recien cuando se abre el buscador por primera vez
  //asi la pagina no hace la peticion salvo que la persona use la busqueda
  function cargarDatosSiFalta() {
    if (datosCargados.current) return;
    datosCargados.current = true;
    obtenerProyectosLigeros()
      .then((datos) => {
        if (Array.isArray(datos)) setProyectos(datos);
      })
      .catch(() => {});
    obtenerServicios()
      .then((datos) => {
        if (Array.isArray(datos)) setServicios(datos);
      })
      .catch(() => {});
  }

  //paginas (estructura) + servicios y proyectos (los dos desde la api)
  const indice = [
    ...paginasBusqueda,
    ...servicios.map((servicio) => ({
      titulo: servicio.nombre,
      tipo: "servicio",
      href: `/servicios/${servicio.slug}`,
    })),
    ...proyectos.map((proyecto) => ({
      titulo: proyecto.titulo ?? "",
      tipo: "proyecto",
      //cada proyecto lleva a su propio detalle, no a la grilla completa
      href: `/proyectos/?id=${proyecto._id}`,
      textoExtra: `${proyecto.resumen ?? ""} ${(proyecto.tags ?? []).join(" ")}`,
    })),
  ];

  const termino = normalizar(consulta.trim());
  const resultados = termino
    ? indice.filter((item) =>
        normalizar(`${item.titulo} ${item.tipo} ${item.textoExtra ?? ""}`).includes(termino)
      )
    : [];

  useEffect(() => {
    function alClicAfuera(evento) {
      if (contenedor.current && !contenedor.current.contains(evento.target)) {
        setAbierto(false);
      }
    }
    function alPresionarTecla(evento) {
      if (evento.key === "Escape") setAbierto(false);
    }
    document.addEventListener("click", alClicAfuera);
    document.addEventListener("keydown", alPresionarTecla);
    return () => {
      document.removeEventListener("click", alClicAfuera);
      document.removeEventListener("keydown", alPresionarTecla);
    };
  }, []);

  return (
    <div ref={contenedor} className="relative">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 focus-within:border-verde-app transition-colors">
        <svg aria-hidden="true" className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
        </svg>
        <input
          type="search"
          value={consulta}
          onChange={(e) => { setConsulta(e.target.value); setAbierto(true); }}
          onFocus={() => { setAbierto(true); cargarDatosSiFalta(); }}
          placeholder="Buscar..."
          aria-label="Buscar en el sitio"
          className="w-32 lg:w-40 bg-transparent text-sm text-white placeholder:text-zinc-600 focus:outline-none"
        />
        {consulta && (
          <button
            type="button"
            aria-label="Limpiar busqueda"
            onClick={() => setConsulta("")}
            className="flex items-center justify-center w-5 h-5 rounded-full text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            x
          </button>
        )}
      </div>
      {abierto && termino && (
        <ul className="absolute right-0 top-full mt-2 w-64 rounded-xl bg-zinc-900 border border-zinc-800 shadow-lg p-2 space-y-1 z-50">
          {resultados.length ? (
            resultados.map((item) => (
              <li key={item.titulo + item.tipo}>
                <a
                  href={item.href}
                  onClick={() => setAbierto(false)}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  <span>{item.titulo}</span>
                  <span className="text-xs text-zinc-500">{item.tipo}</span>
                </a>
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-sm text-zinc-500">Sin resultados</li>
          )}
        </ul>
      )}
    </div>
  );
}
