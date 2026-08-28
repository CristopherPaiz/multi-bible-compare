import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import "./pwa.js";
import { LanguageProvider } from "./context/LanguageContext.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { DataProvider } from "./context/DataContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { AnotacionesProvider } from "./context/AnotacionesContext.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <>
    <ThemeProvider>
      <LanguageProvider>
        <DataProvider>
          <AuthProvider>
            {/* Va DENTRO de AuthProvider: necesita saber si hay sesión para
                decidir si además de guardar en localStorage sincroniza. */}
            <AnotacionesProvider>
              <App />
            </AnotacionesProvider>
          </AuthProvider>
        </DataProvider>
      </LanguageProvider>
    </ThemeProvider>
  </>
);
