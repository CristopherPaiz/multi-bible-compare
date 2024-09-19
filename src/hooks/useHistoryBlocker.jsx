import { useEffect } from "react";

export const useHistoryBlocker = (isModalOpen, closeModal) => {
  useEffect(() => {
    if (!isModalOpen) return;

    // Función para manejar el evento popstate
    const handlePopState = (event) => {
      if (isModalOpen) {
        // Previene la navegación hacia atrás
        event.preventDefault();
        // Empuja un nuevo estado al historial para mantener la URL actual
        window.history.pushState(null, "", window.location.pathname);
        // Cierra el modal
        closeModal();
      }
    };

    // Añade un estado al historial cuando el modal se abre
    window.history.pushState(null, "", window.location.pathname);

    // Añade el event listener para el evento popstate
    window.addEventListener("popstate", handlePopState);

    // Limpieza: remueve el event listener cuando el componente se desmonta
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isModalOpen, closeModal]);
};
