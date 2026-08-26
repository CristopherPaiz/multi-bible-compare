import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { usuarioActual, iniciarSesion, registrar, cerrarSesion, sesionDisponible } from "../services/authSource";

/**
 * Sesión opcional.
 *
 * La app entera funciona sin cuenta: favoritos e historial viven en
 * localStorage como siempre. Iniciar sesión solo agrega que además se
 * sincronicen, así que un fallo aquí NUNCA debe romper la lectura.
 */
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  // Al arrancar se pregunta si la cookie httpOnly sigue siendo válida.
  useEffect(() => {
    let cancelado = false;

    if (!sesionDisponible()) {
      setCargando(false);
      return;
    }

    usuarioActual()
      .then((u) => {
        if (!cancelado) setUsuario(u);
      })
      .catch(() => {
        // Backend dormido o caído: se sigue como invitado, sin molestar.
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, []);

  const entrar = useCallback(async (credenciales) => {
    const data = await iniciarSesion(credenciales);
    setUsuario(data.user);
    return data.user;
  }, []);

  const crearCuenta = useCallback(async (datos) => {
    const data = await registrar(datos);
    setUsuario(data.user);
    return data.user;
  }, []);

  const salir = useCallback(async () => {
    try {
      await cerrarSesion();
    } finally {
      // Aunque el servidor falle, en el cliente la sesión se cierra igual.
      setUsuario(null);
    }
  }, []);

  const valor = useMemo(
    () => ({ usuario, cargando, entrar, crearCuenta, salir, disponible: sesionDisponible() }),
    [usuario, cargando, entrar, crearCuenta, salir]
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default AuthContext;
