//texto que saluda a la persona por su nombre: si hay sesion, usa la version con {nombre},
//y si no hay sesion queda la version normal
//los {nombre} se reemplazan por el nombre de la cuenta que esta iniciada
import { useEffect, useState } from 'react';
import { leerSesion } from '../api/usuarios.js';

export default function SaludoPersonalizado({ sinNombre, conNombre }) {
  const [nombre, setNombre] = useState('');

  useEffect(() => {
    const actualizar = () => setNombre(leerSesion()?.nombre ?? '');
    actualizar();
    //si la persona entra o sale en otra pestaña, el texto se actualiza
    window.addEventListener('storage', actualizar);
    return () => window.removeEventListener('storage', actualizar);
  }, []);

  if (!nombre) return <>{sinNombre}</>;

  return <>{conNombre.replaceAll('{nombre}', nombre)}</>;
}