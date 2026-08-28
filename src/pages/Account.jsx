import { useContext, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import AuthContext from "../context/AuthContext";
import LanguageContext from "../context/LanguageContext";
import { setDataSource, SOURCES } from "../config/dataSource";

/**
 * Cuenta opcional: solo sirve para sincronizar favoritos e historial entre
 * dispositivos. Se dice explícitamente, para que nadie sienta que debe
 * registrarse para leer la Biblia.
 *
 * ---------------------------------------------------------------------------
 * Por qué se valida aquí si el backend ya valida
 * ---------------------------------------------------------------------------
 * Porque el backend contesta DESPUÉS del viaje, y con el servidor dormido ese
 * viaje son treinta segundos para acabar diciendo "el usuario debe tener al
 * menos 3 caracteres". Las reglas de abajo son las mismas de
 * `api/src/validators/auth.schema.ts`, a propósito: aquí evitan el viaje, allá
 * son las que mandan. Si cambian en el servidor, hay que cambiarlas aquí — no
 * al revés.
 */

const REGLAS = {
  USUARIO_MIN: 3,
  USUARIO_MAX: 32,
  USUARIO_PERMITIDO: /^[a-zA-Z0-9_.-]+$/,
  CLAVE_MIN: 8,
  // Deliberadamente flojo: validar correos con precisión es imposible y
  // rechazar uno bueno es peor que aceptar uno malo en un campo opcional.
  CORREO: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
};

const Spinner = () => (
  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
);

const IconoOjo = ({ abierto }) => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
    {abierto ? (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ) : (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10.6 6.1A9.7 9.7 0 0112 6c6 0 9.5 6 9.5 6a17 17 0 01-2.7 3.4M6.3 7.9A17 17 0 002.5 12S6 18 12 18a9.5 9.5 0 003.6-.7"
        />
      </>
    )}
  </svg>
);

IconoOjo.propTypes = { abierto: PropTypes.bool };

/** Campo con etiqueta flotante, error propio y estado de carga. */
const Campo = ({ id, etiqueta, error, ayuda, children }) => (
  <div>
    <label htmlFor={id} className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
      {etiqueta}
    </label>
    {children}
    {/*
      El error va pegado al campo y referenciado con `aria-describedby`, no
      suelto al final del formulario: quien usa lector de pantalla se entera de
      qué campo falla al enfocarlo, sin tener que buscar.
    */}
    {error ? (
      <p id={`${id}-error`} className="mt-1 text-xs text-red-600 dark:text-red-400">
        {error}
      </p>
    ) : (
      ayuda && (
        <p id={`${id}-ayuda`} className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {ayuda}
        </p>
      )
    )}
  </div>
);

Campo.propTypes = {
  id: PropTypes.string.isRequired,
  etiqueta: PropTypes.string.isRequired,
  error: PropTypes.string,
  ayuda: PropTypes.string,
  children: PropTypes.node.isRequired,
};

const Account = () => {
  const { t } = useContext(LanguageContext);
  const { usuario, cargando, sesionIncierta, entrar, crearCuenta, salir, disponible, revalidar } = useContext(AuthContext);

  const [modoRegistro, setModoRegistro] = useState(false);
  const [valores, setValores] = useState({ username: "", email: "", password: "" });
  const [tocados, setTocados] = useState({});
  const [verClave, setVerClave] = useState(false);
  const [mayusculas, setMayusculas] = useState(false);
  const [errorServidor, setErrorServidor] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [saliendo, setSaliendo] = useState(false);

  const primerCampo = useRef(null);

  useEffect(() => {
    if (!usuario && !cargando && disponible) primerCampo.current?.focus();
  }, [usuario, cargando, disponible, modoRegistro]);

  // --- Validación ----------------------------------------------------------

  const errores = useMemo(() => {
    const lista = {};
    const usuarioLimpio = valores.username.trim();

    if (!usuarioLimpio) lista.username = t("CuentaUsuarioVacio");
    else if (modoRegistro) {
      // Al entrar no se valida el formato del usuario: una cuenta creada con
      // reglas viejas seguiría siendo válida y no hay que dejarla fuera.
      if (usuarioLimpio.length < REGLAS.USUARIO_MIN) lista.username = t("CuentaUsuarioCorto");
      else if (usuarioLimpio.length > REGLAS.USUARIO_MAX) lista.username = t("CuentaUsuarioLargo");
      else if (!REGLAS.USUARIO_PERMITIDO.test(usuarioLimpio)) lista.username = t("CuentaUsuarioInvalido");
    }

    if (!valores.password) lista.password = t("CuentaContrasenaVacia");
    else if (modoRegistro && valores.password.length < REGLAS.CLAVE_MIN) lista.password = t("CuentaContrasenaCorta");

    const correoLimpio = valores.email.trim();
    if (modoRegistro && correoLimpio && !REGLAS.CORREO.test(correoLimpio)) lista.email = t("CuentaCorreoInvalido");

    return lista;
  }, [valores, modoRegistro, t]);

  const valido = Object.keys(errores).length === 0;

  /** Un error solo se pinta si el usuario ya pasó por el campo. */
  const errorDe = (campo) => (tocados[campo] ? errores[campo] : undefined);

  const cambiar = (campo) => (evento) => {
    setValores((previo) => ({ ...previo, [campo]: evento.target.value }));
    // El error del servidor deja de ser cierto en cuanto se cambia algo.
    if (errorServidor) setErrorServidor(null);
  };

  const marcarTocado = (campo) => () => setTocados((previo) => ({ ...previo, [campo]: true }));

  const vigilarMayusculas = (evento) => setMayusculas(evento.getModifierState?.("CapsLock") ?? false);

  const enviar = async (evento) => {
    evento.preventDefault();
    setTocados({ username: true, email: true, password: true });
    setErrorServidor(null);
    if (!valido || enviando) return;

    setEnviando(true);
    try {
      const username = valores.username.trim();
      const email = valores.email.trim();
      if (modoRegistro) await crearCuenta({ username, password: valores.password, email: email || undefined });
      else await entrar({ username, password: valores.password });

      setValores((previo) => ({ ...previo, password: "" }));
      setVerClave(false);
    } catch (e) {
      setErrorServidor(e.errores?.[0]?.message ?? e.message);
    } finally {
      setEnviando(false);
    }
  };

  const cambiarModo = () => {
    setModoRegistro((v) => !v);
    setErrorServidor(null);
    setTocados({});
  };

  const cerrar = async () => {
    setSaliendo(true);
    try {
      await salir();
    } finally {
      setSaliendo(false);
    }
  };

  // --- Estilos compartidos -------------------------------------------------

  const caja = "animate-fade-in mx-auto mt-8 w-11/12 max-w-sm rounded-2xl bg-white p-6 shadow-lg dark:bg-neutral-800";

  const campo = (conError) =>
    [
      "w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition",
      "placeholder:text-gray-400 dark:bg-neutral-900 dark:text-white dark:placeholder:text-gray-500",
      "focus:ring-2 focus:ring-offset-0",
      // Deshabilitado tiene que VERSE deshabilitado; si no, el usuario cree que
      // puede escribir mientras la petición está en vuelo.
      "disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:disabled:bg-neutral-800",
      conError
        ? "border-red-400 focus:border-red-500 focus:ring-red-200 dark:border-red-500/70 dark:focus:ring-red-900/50"
        : "border-gray-300 focus:border-emerald-500 focus:ring-emerald-200 dark:border-gray-600 dark:focus:ring-emerald-900/50",
    ].join(" ");

  const botonPrincipal =
    "mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:focus-visible:ring-offset-neutral-800";

  // --- Estados que no son el formulario ------------------------------------

  if (!disponible) {
    return (
      <div className={caja}>
        <h1 className="mb-2 text-center text-lg font-bold dark:text-white">{t("Cuenta")}</h1>
        <p className="text-center text-sm text-gray-700 dark:text-gray-300">{t("CuentaNoDisponible")}</p>
        <button onClick={() => setDataSource(SOURCES.TURSO)} className={botonPrincipal}>
          {t("BuscarActivarApi")}
        </button>
      </div>
    );
  }

  if (cargando) {
    return (
      <div className={caja} aria-busy="true">
        <p className="mb-4 text-center text-sm text-gray-600 dark:text-gray-400">{t("CuentaComprobando")}</p>
        <div className="space-y-3">
          <div className="h-10 animate-pulse rounded-lg bg-gray-200 dark:bg-neutral-700" />
          <div className="h-10 animate-pulse rounded-lg bg-gray-200 dark:bg-neutral-700" />
          <div className="h-10 w-2/3 animate-pulse rounded-lg bg-gray-200 dark:bg-neutral-700" />
        </div>
      </div>
    );
  }

  if (usuario) {
    return (
      <div className={caja}>
        <h1 className="mb-1 text-center text-lg font-bold dark:text-white">{t("Cuenta")}</h1>
        <p className="mb-1 text-center text-sm text-gray-700 dark:text-gray-300">{t("CuentaSesionDe", { usuario: usuario.username })}</p>

        {/*
          Si la sesión no se pudo verificar, se dice. La sincronización está
          parada de verdad en ese caso (ver `useSync`), así que callarlo haría
          creer al usuario que sus notas están a salvo cuando no lo están.
        */}
        {sesionIncierta ? (
          <div className="my-4 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/40">
            <p className="text-xs text-amber-900 dark:text-amber-200">{t("CuentaSesionIncierta")}</p>
            <button
              type="button"
              onClick={revalidar}
              className="mt-2 text-xs font-semibold text-amber-900 underline dark:text-amber-200"
            >
              {t("CuentaReintentar")}
            </button>
          </div>
        ) : (
          <p className="my-4 text-center text-xs text-gray-600 dark:text-gray-400">{t("CuentaSincronizando")}</p>
        )}

        <button
          onClick={cerrar}
          disabled={saliendo}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:focus-visible:ring-offset-neutral-800"
        >
          {saliendo && <Spinner />}
          {saliendo ? t("CuentaSaliendo") : t("CuentaSalir")}
        </button>
      </div>
    );
  }

  // --- Formulario ----------------------------------------------------------

  const textoBoton = enviando ? (modoRegistro ? t("CuentaCreando") : t("CuentaEntrando")) : modoRegistro ? t("CuentaCrear") : t("CuentaEntrar");

  return (
    <form onSubmit={enviar} className={caja} noValidate aria-busy={enviando}>
      <h1 className="mb-1 text-center text-lg font-bold dark:text-white">{modoRegistro ? t("CuentaCrear") : t("CuentaEntrar")}</h1>
      <p className="mb-5 text-center text-xs text-gray-600 dark:text-gray-400">{t("CuentaOpcional")}</p>

      {/*
        `fieldset disabled` apaga TODOS los controles de dentro de una vez,
        incluido el enlace de cambiar de modo. Deshabilitar solo el botón dejaba
        editar los campos y cambiar de modo con la petición en vuelo, y lo que
        volvía del servidor ya no correspondía a lo que se veía en pantalla.
      */}
      <fieldset disabled={enviando} className="contents">
        <div className="flex flex-col gap-4">
          <Campo id="username" etiqueta={t("CuentaUsuario")} error={errorDe("username")}>
            <input
              id="username"
              ref={primerCampo}
              className={campo(Boolean(errorDe("username")))}
              value={valores.username}
              onChange={cambiar("username")}
              onBlur={marcarTocado("username")}
              placeholder={t("CuentaUsuario")}
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              maxLength={REGLAS.USUARIO_MAX}
              aria-invalid={Boolean(errorDe("username"))}
              aria-describedby={errorDe("username") ? "username-error" : undefined}
            />
          </Campo>

          {modoRegistro && (
            <Campo id="email" etiqueta={t("CuentaCorreoOpcional")} error={errorDe("email")} ayuda={t("CuentaCorreoParaQue")}>
              <input
                id="email"
                type="email"
                className={campo(Boolean(errorDe("email")))}
                value={valores.email}
                onChange={cambiar("email")}
                onBlur={marcarTocado("email")}
                placeholder={t("CuentaCorreoOpcional")}
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                aria-invalid={Boolean(errorDe("email"))}
                aria-describedby={errorDe("email") ? "email-error" : "email-ayuda"}
              />
            </Campo>
          )}

          <Campo
            id="password"
            etiqueta={t("CuentaContrasena")}
            error={errorDe("password")}
            ayuda={modoRegistro ? t("CuentaContrasenaCorta") : undefined}
          >
            <div className="relative">
              <input
                id="password"
                type={verClave ? "text" : "password"}
                className={`${campo(Boolean(errorDe("password")))} pr-11`}
                value={valores.password}
                onChange={cambiar("password")}
                onBlur={marcarTocado("password")}
                onKeyUp={vigilarMayusculas}
                onKeyDown={vigilarMayusculas}
                placeholder={t("CuentaContrasena")}
                autoComplete={modoRegistro ? "new-password" : "current-password"}
                aria-invalid={Boolean(errorDe("password"))}
                aria-describedby={errorDe("password") ? "password-error" : modoRegistro ? "password-ayuda" : undefined}
              />
              <button
                type="button"
                onClick={() => setVerClave((v) => !v)}
                // Sin esto, `fieldset disabled` no lo alcanzaría igual, pero el
                // botón seguiría siendo enfocable durante el envío.
                disabled={enviando}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 transition hover:text-gray-800 disabled:opacity-40 dark:text-gray-400 dark:hover:text-gray-200"
                aria-label={verClave ? t("CuentaOcultarContrasena") : t("CuentaVerContrasena")}
                aria-pressed={verClave}
                tabIndex={-1}
              >
                <IconoOjo abierto={verClave} />
              </button>
            </div>
          </Campo>

          {mayusculas && (
            <p className="-mt-2 text-xs text-amber-700 dark:text-amber-400">⇪ {t("CuentaMayusculas")}</p>
          )}
        </div>

        {/*
          `role="alert"` para que el lector de pantalla lo anuncie sin que el
          usuario tenga que ir a buscarlo: acaba de pulsar un botón y la
          respuesta está en otra parte de la pantalla.
        */}
        {errorServidor && (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-red-200 bg-red-50 p-2.5 text-center text-xs text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200"
          >
            {errorServidor}
          </p>
        )}

        <button type="submit" className={botonPrincipal}>
          {enviando && <Spinner />}
          {textoBoton}
        </button>

        <button
          type="button"
          onClick={cambiarModo}
          className="mt-3 w-full rounded text-center text-xs text-blue-600 underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:text-blue-400"
        >
          {modoRegistro ? t("CuentaYaTengo") : t("CuentaNoTengo")}
        </button>
      </fieldset>
    </form>
  );
};

export default Account;
