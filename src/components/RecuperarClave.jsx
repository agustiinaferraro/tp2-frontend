//recuperacion de contraseña, simple: se escribe el email, firebase manda un mail y desde
//ese mail se confirma la contraseña nueva. no hay que elegir metodos ni nada mas.
import { useEffect, useState } from 'react';
import {
  cuentaConfigurada,
  pedirRecuperacionClave,
  verificarLinkRecuperacion,
  guardarClaveNueva,
} from '../api/usuarios.js';

const claseInput =
  'w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-verde-app transition-all';

const claseBotonPrimario =
  'w-full px-5 py-2.5 rounded-full bg-violeta-app hover:bg-violeta-app/90 active:bg-violeta-app/80 text-black text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 cursor-pointer';

const claseBotonSecundario =
  'w-full px-5 py-2.5 rounded-full bg-zinc-800 hover:bg-zinc-700 hover:text-white active:bg-zinc-600 text-zinc-200 border border-zinc-700 text-sm transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 cursor-pointer';

export default function RecuperarClave() {
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [listo, setListo] = useState(false);
  //codigo del link que llega por email (viene en la url: ?oobCode=...)
  const [oobCode, setOobCode] = useState('');
  const [emailDelLink, setEmailDelLink] = useState('');

  useEffect(() => {
    if (!cuentaConfigurada) return;
    const codigoLink = new URLSearchParams(window.location.search).get('oobCode') ?? '';
    if (!codigoLink) return;
    setOobCode(codigoLink);
    //revisa el link: si el codigo vencio o ya se uso, avisa en vez de mostrar el formulario
    verificarLinkRecuperacion(codigoLink)
      .then(({ email: correo }) => setEmailDelLink(correo))
      .catch((err) => setError(err.message));
  }, []);

  //paso 1: pide que manden el mail con el enlace
  async function enviarEnlace(e) {
    e.preventDefault();
    if (enviando) return;
    setEnviando(true);
    setError('');
    try {
      await pedirRecuperacionClave(email.trim());
      setEnviado(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  //paso 2: con el enlace abierto, se pone la contraseña nueva
  async function guardarClave(e) {
    e.preventDefault();
    if (enviando) return;
    if (clave.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setEnviando(true);
    setError('');
    try {
      await guardarClaveNueva(oobCode, clave);
      setListo(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  //la clave ya se cambio: solo se avisa y se vuelve al perfil para entrar
  if (listo) {
    return (
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-8 space-y-4 text-center">
        <span
          aria-hidden="true"
          className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-verde-app/10 border border-verde-app/30 text-verde-app"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="m5 13 4 4L19 7" />
          </svg>
        </span>
        <p className="font-bold text-white text-lg">Contraseña actualizada</p>
        <p className="text-sm text-zinc-400">Ya podés entrar con tu contraseña nueva.</p>
        <a
          href="/perfil"
          className="inline-block px-6 py-2.5 rounded-full bg-verde-app hover:bg-verde-app/90 active:bg-verde-app/80 hover:scale-105 active:scale-95 text-black text-sm font-medium transition-all duration-200"
        >
          Ir a mi perfil
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-8 space-y-5">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-extrabold text-white">Recuperar contraseña</h1>
        <p className="text-sm text-zinc-400 leading-relaxed">
          Escribí tu email y te mandamos un mensaje para crear una contraseña nueva.
        </p>
      </div>

      {/*llego el link por email: se muestra el formulario de la clave nueva*/}
      {oobCode ? (
        <form onSubmit={guardarClave} className="space-y-3">
          {emailDelLink && (
            <p className="text-sm text-zinc-400 text-center">
              Cambiando la contraseña de <span className="text-white">{emailDelLink}</span>
            </p>
          )}
          <input
            type="password"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            placeholder="Contraseña nueva (mínimo 6 caracteres)"
            aria-label="Contraseña nueva"
            autoComplete="new-password"
            required
            className={claseInput}
          />
          {error && <p role="alert" className="text-red-400 text-sm">{error}</p>}
          <button type="submit" disabled={enviando} className={claseBotonPrimario}>
            {enviando ? 'Guardando...' : 'Guardar contraseña nueva'}
          </button>
        </form>
      ) : enviado ? (
        <div className="space-y-4 text-center">
          <p role="status" className="text-sm text-verde-app leading-relaxed">
            Listo. Si <span className="font-semibold text-white">{email.trim()}</span> tiene una
            cuenta, te llegó un mail con el enlace para confirmar y crear tu contraseña nueva.
          </p>
          <button
            type="button"
            onClick={() => { setEnviado(false); setEmail(''); setError(''); }}
            className={claseBotonSecundario}
          >
            Usar otro email
          </button>
        </div>
      ) : (
        <form onSubmit={enviarEnlace} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email con el que te registraste"
            aria-label="Email"
            autoComplete="email"
            required
            className={claseInput}
          />
          {error && <p role="alert" className="text-red-400 text-sm">{error}</p>}
          <button type="submit" disabled={enviando || !email.trim()} className={claseBotonPrimario}>
            {enviando ? 'Enviando...' : 'Enviarme el mail'}
          </button>
        </form>
      )}

      <p className="text-xs text-zinc-500 text-center">
        <a
          href="/perfil"
          className="inline-block rounded-lg px-2 py-1 hover:bg-zinc-800 hover:text-zinc-300 active:scale-95 hover:scale-105 transition-all duration-200"
        >
          Volver a mi perfil
        </a>
      </p>
    </div>
  );
}
