//utilidades de imagen para el panel de administrador
//la compresion se hace en el navegador para que el guardado no falle por lo pesado

//se redimensiona la imagen (max 1280px) y se devuelve en base64 jpg
//si ya viene chica y liviana se devuelve como esta
export function comprimirImagen(archivo) {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onload = () => {
      const img = new Image();
      img.onload = () => {
        if (archivo.size <= 500 * 1024 && img.width <= 1280 && img.height <= 1280) {
          resolver(lector.result);
          return;
        }
        const escala = Math.min(1280 / img.width, 1280 / img.height, 1);
        const ancho = Math.round(img.width * escala);
        const alto = Math.round(img.height * escala);
        const canvas = document.createElement('canvas');
        canvas.width = ancho;
        canvas.height = alto;
        const contexto = canvas.getContext('2d');
        //se rellena de blanco para que el jpg no quede con fondo transparente
        contexto.fillStyle = '#FFFBFB';
        contexto.fillRect(0, 0, ancho, alto);
        contexto.drawImage(img, 0, 0, ancho, alto);
        resolver(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => rechazar(new Error('No se pudo leer la imagen'));
      img.src = lector.result;
    };
    lector.onerror = () => rechazar(new Error('No se pudo leer el archivo'));
    lector.readAsDataURL(archivo);
  });
}

//marca para distinguir la opcion "crear una categoria nueva" en el select
export const OPCION_NUEVA_CATEGORIA = '__nueva__';