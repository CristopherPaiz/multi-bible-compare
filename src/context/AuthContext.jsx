import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { usuarioActual, iniciarSesion, registrar, cerrarSesion, sesionDisponible } from "../services/authSource";

/**
 * Sesión opcional.
 *
 * La app entera funciona sin cuenta: favoritos e historial viven en
 * localStorage como siempre. Iniciar sesión solo agrega que además se
 * sincronicen, así que un fallo aquí NUNCA debe romper la lectura.
 *
 * ---------------------------------------------------------------------------
 * Un 401 y un fallo de red NO son lo mismo
 * ---------------------------------------------------------------------------
 * Antes los dos caían en el mismo `catch` y dejaban `usuario` en `null`, o sea
 * "no hay sesión". Pero solo el 401 significa eso. Un fallo de red significa
 * "todavía no sé", y tratarlo como cierre de sesión tenía dos consecuencias
 * feas: la app te sacaba al recargar con el backend frío, y —peor— la
 * sincronización se saltaba la fusión y luego empujaba solo lo local, borrando
 * en el servidor lo que este dispositivo no había alcanzado a bajar.
 *
 * Por eso hay tres estados, no dos:
 *
 *   usuario = objeto   sesión confirmada.
 *   usuario = null     sin sesión, confirmado por un 401.
 *   sesionIncierta     no se pudo preguntar. NO se toca nada del servidor.
 */
const AuthContext = createContext();

/*
 * El backend duerme cuando no hay tráfico y tarda en despertar. El primer
 * intento sale de inmediato; los otros dos le dan tiempo antes de rendirse.
 */
const ESPERAS_REINTENTO_MS = [0, 2500, 6000];

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [sesionIncierta, setSesionIncierta] = useState(false);

  const cancelado = useRef(false);
  const temporizador = useRef(null);

  const preguntarQuienSoy = useCallback(() => {
    clearTimeout(temporizador.current);

    const intentar = (indice) => {
      usuarioActual()
        .then((u) => {
          if (cancelado.current) return;
          // Llegó respuesta: `u` es el usuario, o `null` si el backend contestó
          // 401. Los dos son certezas.
          setUsuario(u);
          setSesionIncierta(false);
          setCargando(false);
        })
        .catch(() => {
          if (cancelado.current) return;

          const siguiente = indice + 1;
          if (siguiente < ESPERAS_REINTENTO_MS.length) {
            temporizador.current = setTimeout(() => intentar(siguiente), ESPERAS_REINTENTO_MS[siguiente]);
            return;
          }

          // Se agotaron los intentos. No se afirma que no haya sesión: se
          // admite que no se sabe, y la sincronización se queda quieta.
          setSesionIncierta(true);
          setCargando(false);
        });
    };

    setCargando(true);
    intentar(0);
  }, []);

  useEffect(() => {
    cancelado.current = false;

    if (!sesionDisponible()) {
      setCargando(false);
      return undefined;
    }

    preguntarQuienSoy();

    return () => {
      cancelado.current = true;
      clearTimeout(temporizador.current);
    };
  }, [preguntarQuienSoy]);

  const entrar = useCallback(async (credenciales) => {
    const data = await iniciarSesion(credenciales);
    setUsuario(data.user);
    setSesionIncierta(false);
    return data.user;
  }, []);

  const crearCuenta = useCallback(async (datos) => {
    const data = await registrar(datos);
    setUsuario(data.user);
    setSesionIncierta(false);
    return data.user;
  }, []);

  const salir = useCallback(async () => {
    try {
      await cerrarSesion();
    } finally {
      // Aunque el servidor falle, en el cliente la sesión se cierra igual.
      setUsuario(null);
      setSesionIncierta(false);
    }
  }, []);

  const valor = useMemo(
    () => ({
      usuario,
      cargando,
      sesionIncierta,
      entrar,
      crearCuenta,
      salir,
      revalidar: preguntarQuienSoy,
      disponible: sesionDisponible(),
    }),
    [usuario, cargando, sesionIncierta, entrar, crearCuenta, salir, preguntarQuienSoy]
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default AuthContext;
