import { Link } from "react-router-dom";
import LanguageContext from "../context/LanguageContext";
import { useContext } from "react";
const Navbar = () => {
  const { t } = useContext(LanguageContext);
  return (
    <>
      <nav className="bg-white border-gray-200 dark:bg-gray-900">
        <div className="flex flex-wrap justify-between items-center mx-auto max-w-screen-xl p-4">
          <Link to="/" className="flex items-center space-x-3 rtl:space-x-reverse">
            <img src="https://cdn-icons-png.flaticon.com/512/5923/5923090.png" className="h-8" alt="Flowbite Logo" />
            <span className="self-center text-2xl font-semibold whitespace-nowrap dark:text-white">{t("titulo")}</span>
          </Link>
          <div className="flex items-center space-x-6 rtl:space-x-reverse">
            <Link to="/asdas" className="text-sm  text-blue-600 dark:text-blue-500 hover:underline">
              {t("IniciarSesion")}
            </Link>
          </div>
        </div>
      </nav>
      <nav className="bg-gray-50 dark:bg-gray-700 justify-center sm:block flex">
        <div className="max-w-screen-xl px-4 py-3 mx-auto">
          <div className="flex items-center">
            <ul className="flex flex-row font-medium mt-0 space-x-8 rtl:space-x-reverse text-sm">
              <li>
                <Link to="/" className="text-gray-900 dark:text-white hover:underline" aria-current="page">
                  {t("Inicio")}
                </Link>
              </li>
              <li>
                <Link to="/compare" className="text-gray-900 dark:text-white hover:underline">
                  {t("Comparar")}
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-gray-900 dark:text-white hover:underline">
                  {t("Informacion")}
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navbar;
