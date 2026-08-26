import { useContext, useState } from "react";
import TabHebrew from "./TabHebrew";
import LanguageContext from "../context/LanguageContext";
import TabGreek from "./TabGreek";

const Tabs = () => {
  const [activeTab, setActiveTab] = useState(0);
  const { t } = useContext(LanguageContext);

  const changeTab = (index) => {
    setActiveTab(index);
  };

  return (
    <>
      <div className="flex border-b border-gray-300 dark:border-gray-600 gap-x-1">
        <div
          className={`flex items-center gap-2 text-black dark:text-white py-2 px-3 sm:px-4 cursor-pointer border border-gray-300 dark:border-gray-600 rounded-t-lg transition ${
            activeTab === 0 ? "bg-yellow-200 dark:bg-purple-600 font-semibold" : "bg-yellow-100/30 dark:bg-purple-950 opacity-50 hover:opacity-80"
          }`}
          onClick={() => changeTab(0)}
        >
          <span>{t("Hebreo")}</span>
          <span className="rounded-full bg-amber-600/15 px-2 py-0.5 text-xs font-bold text-amber-900 dark:bg-purple-300/20 dark:text-purple-200">
            {t("StrongHebreoCount")}
          </span>
        </div>
        <div
          className={`flex items-center gap-2 text-black dark:text-white py-2 px-3 sm:px-4 cursor-pointer border border-gray-300 dark:border-gray-600 rounded-t-lg transition ${
            activeTab === 1 ? "bg-yellow-200 dark:bg-purple-600 font-semibold" : "bg-yellow-100/30 dark:bg-purple-950 opacity-50 hover:opacity-80"
          }`}
          onClick={() => changeTab(1)}
        >
          <span>{t("Griego")}</span>
          <span className="rounded-full bg-amber-600/15 px-2 py-0.5 text-xs font-bold text-amber-900 dark:bg-purple-300/20 dark:text-purple-200">
            {t("StrongGriegoCount")}
          </span>
        </div>
        {/* <div
          className={`text-black dark:text-white py-2 px-4 cursor-pointer border border-gray-300 dark:border-gray-600 rounded-t-lg ${
            activeTab === 2 ? "bg-yellow-200 dark:bg-purple-600" : "bg-yellow-100/30 dark:bg-purple-950 opacity-40"
          }`}
          onClick={() => changeTab(2)}
        >
          {t("Cognados")}
        </div> */}
      </div>
      <div className="p-5 border border-gray-300 dark:border-gray-600 border-t-0 rounded-b-md">
        {activeTab === 0 && <TabHebrew />}
        {activeTab === 1 && <TabGreek />}
        {/* {activeTab === 2 && <div>{t("Cognados")}</div>} */}
      </div>
    </>
  );
};

export default Tabs;
