import { useContext, useState } from "react";
import AuthContext from "../context/AuthContext";
import LanguageContext from "../context/LanguageContext";
import { setDataSource, SOURCES } from "../config/dataSource";

/**
 * Cuenta opcional: solo sirve para sincronizar favoritos e historial entre
 * dispositivos. Se dice explícitamente, para que nadie sienta que debe
 * registrarse para leer la Biblia.
 */
const Account = () => {
  const { t } = useContext(LanguageContext);
  const { usuario, cargando, entrar, crearCuenta, salir, disponible } = useContext(AuthContext);

  const [modoRegistro, setModoRegistro] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (evento) => {
    evento.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      if (modoRegistro) await crearCuenta({ username, password, email: email || undefined });
      else await entrar({ username, password });
      setPassword("");
    } catch (e) {
      setError(e.errores?.[0]?.message ?? e.message);
    } finally {
      setEnviando(false);
    }
  };

  const caja = "animate-fade-in mx-auto mt-8 w-11/12 max-w-sm rounded-lg bg-white p-5 shadow-md dark:bg-neutral-800";
  const campo =
    "w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-neutral-900 dark:text-white";

  if (!disponible) {
    return (
      <div className={caja}>
        <h1 className="mb-2 text-center text-lg font-bold dark:text-white">{t("Cuenta")}</h1>
        <p className="text-center text-sm text-gray-700 dark:text-gray-300">{t("CuentaNoDisponible")}</p>
        <button
          onClick={() => setDataSource(SOURCES.TURSO)}
          className="mt-4 w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
        >
          {t("BuscarActivarApi")}
        </button>
      </div>
    );
  }

  if (cargando) {
    return (
      <div className={caja}>
        <div className="h-24 animate-pulse rounded-md bg-gray-200 dark:bg-neutral-700"></div>
      </div>
    );
  }

  if (usuario) {
    return (
      <div className={caja}>
        <h1 className="mb-1 text-center text-lg font-bold dark:text-white">{t("Cuenta")}</h1>
        <p className="mb-4 text-center text-sm text-gray-700 dark:text-gray-300">
          {t("CuentaSesionDe", { usuario: usuario.username })}
        </p>
        <p className="mb-4 text-center text-xs text-gray-600 dark:text-gray-400">{t("CuentaSincronizando")}</p>
        <button onClick={salir} className="w-full rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
          {t("CuentaSalir")}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className={caja}>
      <h1 className="mb-1 text-center text-lg font-bold dark:text-white">{modoRegistro ? t("CuentaCrear") : t("CuentaEntrar")}</h1>
      <p className="mb-4 text-center text-xs text-gray-600 dark:text-gray-400">{t("CuentaOpcional")}</p>

      <div className="flex flex-col gap-3">
        <input
          className={campo}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder={t("CuentaUsuario")}
          aria-label={t("CuentaUsuario")}
          autoComplete="username"
          required
        />
        {modoRegistro && (
          <input
            className={campo}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("CuentaCorreoOpcional")}
            aria-label={t("CuentaCorreoOpcional")}
            autoComplete="email"
          />
        )}
        <input
          className={campo}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t("CuentaContrasena")}
          aria-label={t("CuentaContrasena")}
          autoComplete={modoRegistro ? "new-password" : "current-password"}
          required
        />
      </div>

      {error && <p className="mt-3 rounded-md bg-red-100 p-2 text-center text-xs text-red-800 dark:bg-red-900/40 dark:text-red-200">{error}</p>}

      <button
        type="submit"
        disabled={enviando}
        className="mt-4 w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {enviando ? t("CuentaEnviando") : modoRegistro ? t("CuentaCrear") : t("CuentaEntrar")}
      </button>

      <button
        type="button"
        onClick={() => {
          setModoRegistro((v) => !v);
          setError(null);
        }}
        className="mt-3 w-full text-center text-xs text-blue-600 underline dark:text-blue-400"
      >
        {modoRegistro ? t("CuentaYaTengo") : t("CuentaNoTengo")}
      </button>
    </form>
  );
};

export default Account;
