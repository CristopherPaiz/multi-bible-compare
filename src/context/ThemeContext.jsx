import { createContext, useState, useEffect } from "react";
import PropTypes from "prop-types";

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState("light");

  // Función que cambia tema y lo guarda en el localStorage
  const changeTheme = () => {
    if (theme === "light") {
      setTheme("dark");
      localStorage.setItem("theme", "dark");
    } else {
      setTheme("light");
      localStorage.setItem("theme", "light");
    }
  };

  // Función que cambia el valor del html y el color de la barra de estado
  useEffect(() => {
    if (localStorage.getItem("theme") === "dark") {
      setTheme("dark");
      document.documentElement.classList.add("dark");
      document.querySelector("meta[name='theme-color']").setAttribute("content", "#20123A"); // Cambiar a color oscuro
    } else {
      setTheme("light");
      document.documentElement.classList.remove("dark");
      document.querySelector("meta[name='theme-color']").setAttribute("content", "#FDD07A"); // Cambiar a color claro
    }
  }, [theme]);

  // Funciones que retornamos para que puedan usarse en otros lados
  return <ThemeContext.Provider value={{ theme, changeTheme }}>{children}</ThemeContext.Provider>;
};

export default ThemeContext;

ThemeProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
