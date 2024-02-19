import { Link } from "react-router-dom";
import LanguageContext from "../context/LanguageContext";
import { useContext } from "react";
import INFO from "/info.png";
import SETTING from "/setting.png";
import COMPARE from "/compare.png";

const Navbar = () => {
  const { t } = useContext(LanguageContext);
  return (
    <>
      <nav className="bg-[#FDD07A] border-white dark:bg-[#20123A] flex justify-between">
        <Link to="/" className="flex sm:hidden py-4 px-6 gap-2" style={{ alignItems: "center" }}>
          <img src="https://cdn-icons-png.flaticon.com/512/5923/5923090.png" className="h-14 dark:invert" />
          <div className="flex flex-col px-2 dark:text-white sm:flex sm:flex-wrap">
            <span className="text-3xl font-extrabold">{t("Biblian")}</span>
            <span className="text-xl font-semibold">{t("tituloComparar")}</span>
          </div>
        </Link>

        <Link to="/" className="hidden sm:flex p-4 gap-2" style={{ alignItems: "center" }}>
          <img src="https://cdn-icons-png.flaticon.com/512/5923/5923090.png" className="h-12 dark:invert" />
          <div className="flex dark:text-white gap-2 sm:flex sm:flex-wrap">
            <span className="text-3xl font-extrabold">{t("Biblian")}</span>
            <span className="self-end text-xl font-bold">-</span>
            <span className="self-end text-xl font-semibold">{t("tituloComparar")}</span>
          </div>
        </Link>
        <div className="p-4 mr-10 mt-1 hidden sm:flex">
          <div className="flex">
            <ul className="flex flex-row font-medium mt-0 space-x-8 text-sm">
              <li>
                <Link to="/" className="flex text-center justify-center flex-col text-gray-900 dark:text-white hover:scale-105 hover:underline">
                  <img src={COMPARE} className="w-9 h-6 dark:invert m-auto" alt="Comparar" />
                  {t("Comparar")}
                </Link>
              </li>
              <li>
                <Link to="/about" className="flex justify-center flex-col text-gray-900 dark:text-white hover:scale-105 hover:underline">
                  <img src={INFO} className="w-6 h-6 dark:invert m-auto" alt="Info" />
                  {t("Informacion")}
                </Link>
              </li>
              <li>
                <Link to="/settings" className="flex justify-center flex-col text-gray-900 dark:text-white hover:scale-105 hover:underline">
                  <img src={SETTING} className="w-6 h-6 dark:invert m-auto" alt="Ajustes" />
                  {t("Ajustes")}
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </nav>
      <nav className="flex bg-[#fbefda] dark:bg-[#693BCC] justify-center sm:hidden">
        <div className="max-w-screen-xl px-4#ffeac7 py-3 mx-auto">
          <div className="flex items-center justify-center">
            <ul className="flex flex-row font-medium mt-0 space-x-8 text-sm">
              <li>
                <Link to="/" className="flex justify-center flex-col text-gray-900 dark:text-white hover:scale-105 hover:underline">
                  <img src={COMPARE} className="w-9 h-6 dark:invert m-auto" alt="Comparar" />
                  {t("Comparar")}
                </Link>
              </li>
              <li>
                <Link to="/about" className="flex justify-center flex-col text-gray-900 dark:text-white hover:scale-105 hover:underline">
                  <img src={INFO} className="w-6 h-6 dark:invert m-auto" alt="Info" />
                  {t("Informacion")}
                </Link>
              </li>
              <li>
                <Link to="/settings" className="flex justify-center flex-col text-gray-900 dark:text-white hover:scale-105 hover:underline">
                  <img src={SETTING} className="w-6 h-6 dark:invert m-auto" alt="Ajustes" />
                  {t("Ajustes")}
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
