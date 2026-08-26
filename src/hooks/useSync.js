import { useContext, useEffect, useRef } from "react";
import AuthContext from "../context/AuthContext";
import { getCatalogMaps } from "../services/tursoSource";
import { leerFavoritos, guardarFavoritos, leerHistorial } from "../services/authSource";

/**
 * Sincroniza favoritos e historial cuando hay sesión.
 *
 * Principio: localStorage sigue siendo la fuente de verdad LOCAL. El servidor
 * es una copia para que los datos sobrevivan al cambio de dispositivo. Si el
 * backend falla, la app funciona igual — por eso todo va envuelto en catch.
 *
 * Al entrar se hace UNIÓN, no reemplazo: si el usuario marcó favoritos en el
 * teléfono y otros en la laptop, se quedan todos. Reemplazar borraría trabajo
 * del usuario sin que él lo pidiera.
 */

const leerLista = (clave) => {
  try {
    const crudo = localStorage.getItem(clave);
    const valor = crudo ? JSON.parse(crudo) : [];
    return Array.isArray(valor) ? valor : [];
  } catch {
    return [];
  }
};

const escribirLista = (clave, valor) => {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    // Safari privado: sin persistencia, pero la sesión sigue.
  }
};

export const useSync = () => {
  const { usuario, disponible } = useContext(AuthContext);
  const yaSincronizado = useRef(null);

  useEffect(() => {
    if (!usuario || !disponible) {
      yaSincronizado.current = null;
      return;
    }
    // Solo una vez por usuario, no en cada render.
    if (yaSincronizado.current === usuario.id) return;
    yaSincronizado.current = usuario.id;

    let cancelado = false;

    const sincronizar = async () => {
      try {
        const { byLegacyPath, byId } = await getCatalogMaps();

        // --- Favoritos: unión entre lo local y lo del servidor ---
        const localRutas = leerLista("favoriteBooks");
        const remotosIds = await leerFavoritos();

        const remotasRutas = remotosIds.map((id) => byId.get(id)?.legacyPath).filter(Boolean);
        const union = [...new Set([...localRutas, ...remotasRutas])];

        if (cancelado) return;

        if (union.length !== localRutas.length) escribirLista("favoriteBooks", union);

        const idsUnion = union.map((ruta) => byLegacyPath.get(ruta)).filter(Boolean);
        const cambio = idsUnion.length !== remotosIds.length || idsUnion.some((id) => !remotosIds.includes(id));
        if (cambio) await guardarFavoritos(idsUnion);

        // --- Historial: se trae el del servidor y se fusiona con el local ---
        const historialRemoto = await leerHistorial();
        if (cancelado || historialRemoto.length === 0) return;

        const historialLocal = leerLista("history");
        const clave = (h) => `${h.libroSeleccionado}|${h.capituloSeleccionadoNumero}|${h.versiculoSeleccionadoNumero}`;
        const vistos = new Set(historialLocal.map(clave));

        const convertidos = historialRemoto
          .map((h) => ({
            bibliasSeleccionadas: h.bibleIds.map((id) => byId.get(id)?.legacyPath).filter(Boolean),
            libroSeleccionado: `book${h.bookId}`,
            capituloSeleccionadoNumero: h.chapter,
            versiculoSeleccionadoNumero: h.verse ?? 0,
          }))
          .filter((h) => !vistos.has(clave(h)));

        if (convertidos.length > 0) escribirLista("history", [...historialLocal, ...convertidos].slice(-40));
      } catch {
        // Sincronizar es un extra: si falla, la app sigue con localStorage.
      }
    };

    sincronizar();
    return () => {
      cancelado = true;
    };
  }, [usuario, disponible]);
};

/**
 * Empuja los favoritos al servidor. La llama `ListBooks` cuando el usuario
 * marca o desmarca una versión; sin sesión no hace nada.
 */
export const empujarFavoritos = async (rutas) => {
  try {
    const { byLegacyPath } = await getCatalogMaps();
    const ids = rutas.map((ruta) => byLegacyPath.get(ruta)).filter(Boolean);
    await guardarFavoritos(ids);
  } catch {
    // Silencioso a propósito: el favorito ya quedó guardado en localStorage.
  }
};
