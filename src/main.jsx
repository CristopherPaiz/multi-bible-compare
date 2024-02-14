import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { LanguageProvider } from "./context/LanguageContext.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { DataProvider } from "./context/DataContext.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <>
    <ThemeProvider>
      <LanguageProvider>
        <DataProvider>
          <App />
        </DataProvider>
      </LanguageProvider>
    </ThemeProvider>
  </>
);
