import { lazy, Suspense, useContext, useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import About from "./pages/About";
import Compare from "./pages/Compare";
import NotFound from "./pages/NotFound";
import Settings from "./pages/Settings";
import ThemeContext from "./context/ThemeContext";
import Home from "./pages/Home";
import HistoryPage from "./pages/HistoryPage";
import Search from "./pages/Search";
import Account from "./pages/Account";
import Notes from "./pages/Notes";
import { useSync } from "./hooks/useSync";
import FloatingBubble from "./components/FloatingBubble";
import StrongPopup from "./components/StrongPopup";
import DataContext from "./context/DataContext";
import ShareModal from "./components/ShareModal";
import PaletaComandos from "./components/PaletaComandos";
import ConcordanciaStrong from "./components/ConcordanciaStrong";
import { preheat } from "./services/bibleSource";
import { useMemoriaScroll } from "./hooks/useMemoriaScroll";

/*
 * El lector 3D se carga aparte. Arrastra `react-pageflip` y su propia hoja de
 * estilos, y es una pantalla a la que no entra quien solo viene a comparar
 * versiones: metida en el bundle principal, todos pagarían su descarga.
 */
const Bible3D = lazy(() => import("./pages/Bible3D"));

/*
 * El atlas también se carga aparte. Arrastra el catálogo de lugares y la
 * cronología —datos que solo esa pantalla usa— y quien entra a comparar dos
 * versiones no tiene por qué descargarlos.
 */
const Atlas = lazy(() => import("./pages/Atlas"));

/**
 * El hook necesita `useLocation`, que solo existe dentro del router, y `App` es
 * quien lo monta. Este componente vacío es la forma de meterlo dentro sin
 * partir `App` en dos.
 */
const MemoriaScroll = () => {
  useMemoriaScroll();
  return null;
};

const App = () => {
  const { theme } = useContext(ThemeContext);
  const { setCompartir, compartir } = useContext(DataContext);

  const styles = {
    backgroundColor: theme === "light" ? "#FFFFFF" : "#161519",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='90' height='90' viewBox='0 0 90 90'%3E%3Cg fill='%23${
      theme === "light" ? "f5c461" : "000"
    }' fill-opacity='0.1'%3E%3Cpath fill-rule='evenodd' d='M11 0l5 20H6l5-20zm42 31a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM0 72h40v4H0v-4zm0-8h31v4H0v-4zm20-16h20v4H20v-4zM0 56h40v4H0v-4zm63-25a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm10 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM53 41a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm10 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm10 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-30 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-28-8a5 5 0 0 0-10 0h10zm10 0a5 5 0 0 1-10 0h10zM56 5a5 5 0 0 0-10 0h10zm10 0a5 5 0 0 1-10 0h10zm-3 46a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm10 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM21 0l5 20H16l5-20zm43 64v-4h-4v4h-4v4h4v4h4v-4h4v-4h-4zM36 13h4v4h-4v-4zm4 4h4v4h-4v-4zm-4 4h4v4h-4v-4zm8-8h4v4h-4v-4z'/%3E%3C/g%3E%3C/svg%3E")`,
  };

  const modalRef = useRef(null);

  // Se despierta el backend en cuanto abre la app, no cuando el usuario ya
  // quiere leer.
  useEffect(() => {
    preheat();
  }, []);

  // Si hay sesión, fusiona favoritos e historial con los del servidor.
  useSync();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setCompartir(false);
      }
    };

    if (compartir) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [compartir, setCompartir]);

  return (
    <>
      <ShareModal />
      <StrongPopup />
      <div className="backgroundPattern w-full h-full fixed -z-50" style={styles}></div>
      <BrowserRouter>
        <Navbar />
        {/* Recuerda la altura de cada pasaje para el botón "atrás". */}
        <MemoriaScroll />
        {/* Dentro del router: sus opciones navegan. */}
        <PaletaComandos />
        {/* Igual: cada aparición es un enlace al pasaje. */}
        <ConcordanciaStrong />
        <FloatingBubble />
        <Routes>
          <Route path="/" element={<Home />} />
          {/*
            Las cuatro formas de la misma pantalla. Se declaran una por una en
            vez de usar segmentos opcionales para que la ruta siga siendo
            legible y para que `/compare` a secas no dependa de cómo resuelva
            el router los parámetros ausentes.
          */}
          <Route path="/compare" element={<Compare />} />
          <Route path="/compare/:libro" element={<Compare />} />
          <Route path="/compare/:libro/:capitulo" element={<Compare />} />
          <Route path="/compare/:libro/:capitulo/:versiculo" element={<Compare />} />
          <Route path="/about" element={<About />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/search" element={<Search />} />
          <Route
            path="/3d"
            element={
              <Suspense fallback={null}>
                <Bible3D />
              </Suspense>
            }
          />
          <Route path="/notes" element={<Notes />} />
          <Route
            path="/atlas"
            element={
              <Suspense fallback={null}>
                <Atlas />
              </Suspense>
            }
          />
          <Route path="/account" element={<Account />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </>
  );
};

export default App;
