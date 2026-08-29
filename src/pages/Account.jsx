import { useContext, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import AuthContext from "../context/AuthContext";
import LanguageContext from "../context/LanguageContext";
import { setDataSource, SOURCES } from "../config/dataSource";
import LOGO from "/bibleIcon.svg";

/**
 * Cuenta opcional: solo sirve para sincronizar favoritos, notas e historial
 * entre dispositivos. Se dice explícitamente, para que nadie sienta que debe
 * registrarse para leer la Biblia.
 *
 * ---------------------------------------------------------------------------
 * La pantalla tiene que vender, no solo pedir
 * ---------------------------------------------------------------------------
 * Un formulario de dos campos delante de alguien que NO necesita cuenta para
 * usar la app es una pregunta sin contexto: "¿y esto para qué?". Por eso la
 * pantalla dice primero qué se gana y deja a la vista la salida ("seguir sin
 * cuenta"). La cuenta es opcional de verdad; la interfaz debe comportarse como
 * si lo fuera.
 *
 * Los colores salen de los que la app ya usa —oro en claro, morado en oscuro,
 * los mismos de la barra y del botón de inicio— y no de una paleta nueva. Una
 * pantalla de sesión que parece de otra aplicación es justo lo que hace dudar
 * antes de escribir una contraseña.
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

/* --------------------------------------------------------------------------
 * Piezas visuales
 * ------------------------------------------------------------------------ */

const Spinner = ({ clase = "h-4 w-4" }) => (
  <svg className={`${clase} animate-spin`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
);

Spinner.propTypes = { clase: PropTypes.string };

const IconoUsuario = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.1a7.5 7.5 0 0 1 15 0A17.9 17.9 0 0 1 12 21.75c-2.7 0-5.2-.6-7.5-1.65Z" />
  </svg>
);

const IconoCorreo = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m18 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m18 0v.24a2.25 2.25 0 0 1-1.07 1.91l-7.5 4.62a2.25 2.25 0 0 1-2.36 0L3.32 8.9a2.25 2.25 0 0 1-1.07-1.91v-.24" />
  </svg>
);

const IconoCandado = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75M6.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75A2.25 2.25 0 0 0 4.5 12.75v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
  </svg>
);

const IconoCheck = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
  </svg>
);

const IconoOjo = ({ abierto, className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
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

const propsIcono = { className: PropTypes.string };
IconoUsuario.propTypes = propsIcono;
IconoCorreo.propTypes = propsIcono;
IconoCandado.propTypes = propsIcono;
IconoCheck.propTypes = propsIcono;
IconoOjo.propTypes = { ...propsIcono, abierto: PropTypes.bool };

/**
 * Campo con etiqueta, icono e hueco fijo para el mensaje.
 *
 * El hueco se reserva aunque no haya error (`min-h`): sin eso, el formulario
 * daba un salto cada vez que aparecía o desaparecía un mensaje, y el botón se
 * movía justo cuando el usuario iba a pulsarlo.
 */
const Campo = ({ id, etiqueta, icono: Icono, error, ayuda, children }) => (
  <div>
    <label htmlFor={id} className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
      {etiqueta}
    </label>
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-neutral-400 dark:text-neutral-500">
        <Icono className="h-[18px] w-[18px]" />
      </span>
      {children}
    </div>
    <div className="min-h-[1.15rem] pt-1">
      {error ? (
        <p id={`${id}-error`} className="flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
          <span aria-hidden="true">•</span>
          {error}
        </p>
      ) : (
        ayuda && (
          <p id={`${id}-ayuda`} className="text-xs text-neutral-500 dark:text-neutral-400">
            {ayuda}
          </p>
        )
      )}
    </div>
  </div>
);

Campo.propTypes = {
  id: PropTypes.string.isRequired,
  etiqueta: PropTypes.string.isRequired,
  icono: PropTypes.func.isRequired,
  error: PropTypes.string,
  ayuda: PropTypes.string,
  children: PropTypes.node.isRequired,
};

const Beneficio = ({ texto }) => (
  <li className="flex items-start gap-2.5">
    <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-[#a97109]/15 text-[#8a5c07] dark:bg-purple-400/20 dark:text-purple-300">
      <IconoCheck className="h-2.5 w-2.5" />
    </span>
    <span className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">{texto}</span>
  </li>
);

Beneficio.propTypes = { texto: PropTypes.string.isRequired };

/**
 * Cabecera con la marca. Va FUERA del componente a propósito: definida dentro,
 * React la trata como un tipo de componente nuevo en cada render y desmonta y
 * vuelve a montar el bloque entero con cada tecla que se escribe.
 */
const Cabecera = ({ titulo, subtitulo }) => (
  <div className="mb-6 flex flex-col items-center text-center">
    <div className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-[#FDD07A] shadow-md shadow-[#a97109]/20 dark:bg-[#20123A] dark:shadow-black/40">
      <img src={LOGO} alt="" className="h-8 w-8" />
    </div>
    <h1 className="font-['EB_Garamond',_Georgia,_serif] text-2xl font-bold text-neutral-900 dark:text-white">{titulo}</h1>
    {subtitulo && <p className="mt-1 max-w-[16rem] text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">{subtitulo}</p>}
  </div>
);

Cabecera.propTypes = { titulo: PropTypes.string.isRequired, subtitulo: PropTypes.string };

/* --------------------------------------------------------------------------
 * Pantalla
 * ------------------------------------------------------------------------ */

const Account = () => {
  const { t, idiomaNavegador } = useContext(LanguageContext);
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

  const irA = (registro) => () => {
    if (registro === modoRegistro) return;
    setModoRegistro(registro);
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

  /*
   * El envoltorio da altura completa y centra. La tarjeta se apoya sobre el
   * patrón de fondo que ya pinta `App`, así que no lleva fondo propio de
   * pantalla: solo se separa de él con sombra y borde.
   */
  const pantalla = "animate-fade-in mx-auto flex w-11/12 max-w-md flex-col justify-center px-1 pb-16 pt-8";

  const tarjeta =
    "overflow-hidden rounded-3xl border border-black/5 bg-white/95 shadow-xl shadow-black/5 backdrop-blur-sm dark:border-white/10 dark:bg-neutral-900/95 dark:shadow-black/40";

  const campo = (conError) =>
    [
      "w-full rounded-xl border bg-white py-3 pl-11 pr-3 text-sm text-neutral-900 outline-none transition",
      "placeholder:text-neutral-400 dark:bg-neutral-950 dark:text-white dark:placeholder:text-neutral-500",
      "focus:ring-4",
      // Deshabilitado tiene que VERSE deshabilitado; si no, el usuario cree que
      // puede escribir mientras la petición está en vuelo.
      "disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400 dark:disabled:bg-neutral-800/60",
      conError
        ? "border-red-400 focus:border-red-500 focus:ring-red-500/15 dark:border-red-500/70"
        : "border-neutral-200 focus:border-[#a97109] focus:ring-[#a97109]/15 dark:border-neutral-700 dark:focus:border-purple-400 dark:focus:ring-purple-400/20",
    ].join(" ");

  const botonPrincipal =
    "flex w-full items-center justify-center gap-2 rounded-xl bg-[#a97109] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-[#a97109]/25 transition hover:bg-[#8a5c07] active:scale-[0.98] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#a97109]/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none dark:bg-purple-600 dark:shadow-purple-900/40 dark:hover:bg-purple-700 dark:focus-visible:ring-purple-400/30";

  // --- Estados que no son el formulario ------------------------------------

  if (!disponible) {
    return (
      <div className={pantalla}>
        <Cabecera titulo={t("Cuenta")} />
        <div className={`${tarjeta} p-6`}>
          <p className="text-center text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">{t("CuentaNoDisponible")}</p>
          <button onClick={() => setDataSource(SOURCES.TURSO)} className={`${botonPrincipal} mt-5`}>
            {t("BuscarActivarApi")}
          </button>
        </div>
      </div>
    );
  }

  if (cargando) {
    return (
      <div className={pantalla} aria-busy="true">
        <Cabecera titulo={t("Cuenta")} subtitulo={t("CuentaComprobando")} />
        <div className={`${tarjeta} space-y-4 p-6`}>
          <div className="h-3 w-20 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
          <div className="h-11 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />
          <div className="h-3 w-24 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
          <div className="h-11 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />
          <div className="h-12 animate-pulse rounded-xl bg-neutral-300 dark:bg-neutral-700" />
        </div>
      </div>
    );
  }

  if (usuario) {
    const desde = (() => {
      const fecha = new Date(usuario.createdAt);
      if (Number.isNaN(fecha.getTime())) return null;
      return new Intl.DateTimeFormat(idiomaNavegador === "en" ? "en-US" : "es-ES", { month: "long", year: "numeric" }).format(fecha);
    })();

    return (
      <div className={pantalla}>
        <Cabecera titulo={t("Cuenta")} />
        <div className={`${tarjeta} p-6`}>
          <div className="flex items-center gap-4">
            {/* La inicial en un disco con el oro de la marca: da identidad sin
                pedir una foto de perfil que nadie va a subir. */}
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#FDD07A] to-[#a97109] font-['EB_Garamond',_Georgia,_serif] text-2xl font-bold text-white shadow-inner dark:from-purple-500 dark:to-purple-800">
              {usuario.username.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-bold text-neutral-900 dark:text-white">{usuario.username}</p>
              {usuario.email && <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{usuario.email}</p>}
              {desde && <p className="mt-0.5 text-[11px] text-neutral-400 dark:text-neutral-500">{t("CuentaMiembroDesde", { fecha: desde })}</p>}
            </div>
          </div>

          {/*
            Si la sesión no se pudo verificar, se dice. La sincronización está
            parada de verdad en ese caso (ver `useSync`), así que callarlo haría
            creer al usuario que sus notas están a salvo cuando no lo están.
          */}
          {sesionIncierta ? (
            <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-3.5 dark:border-amber-800/60 dark:bg-amber-950/40">
              <p className="text-xs leading-relaxed text-amber-900 dark:text-amber-200">{t("CuentaSesionIncierta")}</p>
              <button
                type="button"
                onClick={revalidar}
                className="mt-2 rounded text-xs font-bold text-amber-900 underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:text-amber-200"
              >
                {t("CuentaReintentar")}
              </button>
            </div>
          ) : (
            <div className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 dark:border-emerald-900/60 dark:bg-emerald-950/40">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <p className="text-xs leading-relaxed text-emerald-900 dark:text-emerald-200">
                <span className="font-bold">{t("CuentaSincronizado")}.</span> {t("CuentaSincronizando")}
              </p>
            </div>
          )}

          <button
            onClick={cerrar}
            disabled={saliendo}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-transparent px-4 py-3 text-sm font-bold text-red-600 transition hover:bg-red-50 active:scale-[0.98] focus:outline-none focus-visible:ring-4 focus-visible:ring-red-500/25 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            {saliendo && <Spinner />}
            {saliendo ? t("CuentaSaliendo") : t("CuentaSalir")}
          </button>
        </div>
      </div>
    );
  }

  // --- Formulario ----------------------------------------------------------

  const textoBoton = enviando ? (modoRegistro ? t("CuentaCreando") : t("CuentaEntrando")) : modoRegistro ? t("CuentaCrear") : t("CuentaEntrar");

  const pestana = (activa) =>
    [
      "relative z-10 flex-1 rounded-lg py-2 text-center text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a97109]/40 dark:focus-visible:ring-purple-400/40",
      activa ? "text-neutral-900 dark:text-white" : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200",
    ].join(" ");

  return (
    <div className={pantalla}>
      <Cabecera titulo={t("Cuenta")} subtitulo={t("CuentaSubtitulo")} />

      <form onSubmit={enviar} className={`${tarjeta} p-6`} noValidate aria-busy={enviando}>
        {/*
          `fieldset disabled` apaga TODOS los controles de dentro de una vez,
          incluidas las pestañas. Deshabilitar solo el botón dejaba editar los
          campos y cambiar de modo con la petición en vuelo, y lo que volvía del
          servidor ya no correspondía a lo que se veía en pantalla.
        */}
        <fieldset disabled={enviando} className="contents">
          {/* Entrar / Crear cuenta como interruptor, no como enlace al final.
              Antes había que leer todo el formulario para descubrir que existía
              la otra opción. */}
          <div
            className="relative mb-6 flex rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800"
            role="group"
            aria-label={t("Cuenta")}
          >
            <span
              aria-hidden="true"
              className={`absolute inset-y-1 left-1 z-0 w-[calc(50%-0.25rem)] rounded-lg bg-white shadow-sm transition-transform duration-200 ease-out dark:bg-neutral-700 ${
                modoRegistro ? "translate-x-full" : "translate-x-0"
              }`}
            />
            <button type="button" aria-pressed={!modoRegistro} onClick={irA(false)} className={pestana(!modoRegistro)}>
              {t("CuentaEntrar")}
            </button>
            <button type="button" aria-pressed={modoRegistro} onClick={irA(true)} className={pestana(modoRegistro)}>
              {t("CuentaCrear")}
            </button>
          </div>

          <Campo id="username" etiqueta={t("CuentaUsuario")} icono={IconoUsuario} error={errorDe("username")}>
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
            <Campo id="email" etiqueta={t("CuentaCorreoOpcional")} icono={IconoCorreo} error={errorDe("email")} ayuda={t("CuentaCorreoParaQue")}>
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
            icono={IconoCandado}
            error={errorDe("password")}
            ayuda={modoRegistro ? t("CuentaContrasenaCorta") : undefined}
          >
            <input
              id="password"
              type={verClave ? "text" : "password"}
              className={`${campo(Boolean(errorDe("password")))} pr-12`}
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
              className="absolute inset-y-0 right-0 flex items-center px-3.5 text-neutral-400 transition hover:text-neutral-700 disabled:opacity-40 dark:text-neutral-500 dark:hover:text-neutral-200"
              aria-label={verClave ? t("CuentaOcultarContrasena") : t("CuentaVerContrasena")}
              aria-pressed={verClave}
              tabIndex={-1}
            >
              <IconoOjo abierto={verClave} className="h-5 w-5" />
            </button>
          </Campo>

          {mayusculas && (
            <p className="-mt-1 mb-3 flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              <span aria-hidden="true">⇪</span>
              {t("CuentaMayusculas")}
            </p>
          )}

          {/*
            `role="alert"` para que el lector de pantalla lo anuncie sin que el
            usuario tenga que ir a buscarlo: acaba de pulsar un botón y la
            respuesta está en otra parte de la pantalla.
          */}
          {errorServidor && (
            <p
              role="alert"
              className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-center text-xs font-medium leading-relaxed text-red-800 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-200"
            >
              {errorServidor}
            </p>
          )}

          <button type="submit" className={`${botonPrincipal} mt-1`}>
            {enviando && <Spinner />}
            {textoBoton}
          </button>
        </fieldset>
      </form>

      {/* La cuenta es opcional. La salida se deja a la vista, no escondida. */}
      <div className="mt-6 px-2">
        <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">{t("CuentaBeneficios")}</p>
        <ul className="space-y-2">
          <Beneficio texto={t("CuentaBeneficioVersiones")} />
          <Beneficio texto={t("CuentaBeneficioNotas")} />
          <Beneficio texto={t("CuentaBeneficioHistorial")} />
        </ul>
        <Link
          to="/compare"
          className="mt-5 block rounded-lg py-2 text-center text-xs font-semibold text-neutral-500 underline underline-offset-4 transition hover:text-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a97109]/40 dark:text-neutral-400 dark:hover:text-neutral-200"
        >
          {t("CuentaSeguirSinCuenta")}
        </Link>
      </div>
    </div>
  );
};

export default Account;
