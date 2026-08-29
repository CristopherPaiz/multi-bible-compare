import { useSyncExternalStore } from "react";

/**
 * Listas guardadas en localStorage, con UN solo dueño.
 *
 * ---------------------------------------------------------------------------
 * Por qué existe este archivo
 * ---------------------------------------------------------------------------
 * Los favoritos vivían en dos sitios a la vez: el estado de `ListBooks` y
 * localStorage. La sincronización escribía en localStorage directamente, pero
 * `ListBooks` ya había copiado la lista a su estado al montar y no se enteraba.
 * En cuanto el usuario tocaba cualquier cosa, `ListBooks` reescribía
 * localStorage desde su copia vieja —borrando la fusión— y acto seguido hacía
 * `PUT /api/user/favorites` con esa lista vieja, que en el servidor REEMPLAZA.
 *
 * Resultado: marcar un favorito en el teléfono borraba los de la laptop.
 *
 * La solución no es más cuidado en el orden de los efectos, es quitar la copia.
 * Aquí localStorage es el único dueño y React se suscribe a él con
 * `useSyncExternalStore`. Escriba quien escriba —un componente, la
 * sincronización u otra pestaña— todos ven lo mismo en el acto.
 */

const leerDelDisco = (clave) => {
  try {
    const crudo = localStorage.getItem(clave);
    const valor = crudo ? JSON.parse(crudo) : [];
    return Array.isArray(valor) ? valor : [];
  } catch {
    // Safari privado, cuota llena o JSON corrupto: se empieza vacío.
    return [];
  }
};

const mismasEntradas = (a, b) => a.length === b.length && a.every((valor, indice) => valor === b[indice]);

/**
 * @param {string} clave Nombre en localStorage.
 * @returns almacén con `leer`, `escribir`, `actualizar`, `suscribir`.
 */
export const crearAlmacenLista = (clave) => {
  /*
   * `useSyncExternalStore` compara el resultado de `leer` por identidad y entra
   * en bucle si cada llamada devuelve un arreglo nuevo. Por eso la lista se
   * guarda aquí y solo se reemplaza cuando cambia de verdad.
   */
  let instantanea = leerDelDisco(clave);
  const oyentes = new Set();

  const avisar = () => {
    for (const oyente of oyentes) oyente();
  };

  const leer = () => instantanea;

  const escribir = (siguiente) => {
    const lista = Array.isArray(siguiente) ? siguiente : [];
    if (mismasEntradas(lista, instantanea)) return instantanea;

    instantanea = lista;
    try {
      localStorage.setItem(clave, JSON.stringify(instantanea));
    } catch {
      // Sin persistencia, pero la sesión actual sigue coherente.
    }
    avisar();
    return instantanea;
  };

  const actualizar = (transformar) => escribir(transformar(instantanea));

  const suscribir = (oyente) => {
    oyentes.add(oyente);
    return () => {
      oyentes.delete(oyente);
    };
  };

  // Otra pestaña de la misma app escribiendo la misma clave. Sin esto, dos
  // pestañas abiertas se pisan igual que se pisaban los dispositivos.
  if (typeof window !== "undefined") {
    window.addEventListener("storage", (evento) => {
      if (evento.key !== null && evento.key !== clave) return;
      const desdeDisco = leerDelDisco(clave);
      if (mismasEntradas(desdeDisco, instantanea)) return;
      instantanea = desdeDisco;
      avisar();
    });
  }

  return { clave, leer, escribir, actualizar, suscribir };
};

/** Suscribe un componente al almacén. Se re-renderiza cuando la lista cambia. */
export const useAlmacen = (almacen) => useSyncExternalStore(almacen.suscribir, almacen.leer, almacen.leer);

/** Versiones marcadas como favoritas, por su ruta (`"75. Español - ..."`). */
export const favoritos = crearAlmacenLista("favoriteBooks");
