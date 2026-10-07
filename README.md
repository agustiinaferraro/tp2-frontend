# Frontend — Portfolio

Sitio web del portfolio, construido con Astro + React + Tailwind CSS v4.

## Estructura

```
src/
├── components/   # secciones y componentes (astro y react)
├── data/         # indice estatico del buscador (paginas y servicios)
├── layouts/      # layout general del sitio
├── pages/        # rutas: inicio, sobre-mi, proyectos, servicios, contacto y admin
├── api/          # capa de datos: funciones que hablan con el backend
└── styles/       # estilos globales
```

## Comandos

| Comando          | Descripcion                                 |
| :--------------- | :------------------------------------------ |
| `yarn install`   | Instala las dependencias                    |
| `yarn dev`       | Levanta el sitio en `localhost:4321`        |
| `yarn build`     | Genera los archivos estaticos en `dist/`    |
| `yarn preview`   | Sirve el build generado en local            |

## Deploy

Desplegado en Vercel como sitio estático: https://agustinaportfolio.vercel.app

- La variable `PUBLIC_API_URL` (URL del backend) se configura en Vercel y se inlinea en el build.
- La variable `PUBLIC_API_URL` actualmente apunta a https://agustinaportfolio-api.vercel.app

## Panel de administración

La ruta `/admin` es un panel privado para cargar, editar y borrar proyectos y para leer los mensajes del formulario de contacto. Pide la clave `ADMIN_CLAVE` del backend (en producción se configura en las variables de entorno del backend en Vercel).