import { useState } from "react";
import TabHebrew from "./TabHebrew";

const Tabs = () => {
  const [activeTab, setActiveTab] = useState(0);

  const changeTab = (index) => {
    setActiveTab(index);
  };

  return (
    <>
      <div className="flex border-b border-gray-300 dark:border-gray-600 gap-x-1">
        <div
          className={`text-black dark:text-white py-2 px-4 cursor-pointer border border-gray-300 dark:border-gray-600 rounded-t-lg ${
            activeTab === 0 ? "bg-white dark:bg-neutral-600" : "bg-gray-200 dark:bg-transparent opacity-40"
          }`}
          onClick={() => changeTab(0)}
        >
          Hebreo
        </div>
        <div
          className={`text-black dark:text-white py-2 px-4 cursor-pointer border border-gray-300 dark:border-gray-600 rounded-t-lg ${
            activeTab === 1 ? "bg-white dark:bg-neutral-600" : "bg-gray-200 dark:bg-transparent opacity-40"
          }`}
          onClick={() => changeTab(1)}
        >
          Griego
        </div>
      </div>
      <div className="p-5 border border-gray-300 dark:border-gray-600 border-t-0 rounded-b-md">
        {activeTab === 0 && <TabHebrew />}
        {activeTab === 1 && <div>Contenido de Griego próximamente...</div>}
      </div>
    </>
  );
};

export default Tabs;
