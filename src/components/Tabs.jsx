import { useState } from "react";
import "../styles/Tabs.css";

const Tabs = () => {
  const [activeTab, setActiveTab] = useState(0);

  const changeTab = (index) => {
    setActiveTab(index);
  };

  return (
    <div className="tabs-container">
      <div className="tabs">
        {/* Pestañas */}
        <div className={`tab ${activeTab === 0 ? "active" : ""}`} onClick={() => changeTab(0)}>
          Tab 1
        </div>
        <div className={`tab ${activeTab === 1 ? "active" : ""}`} onClick={() => changeTab(1)}>
          Tab 2
        </div>
      </div>
      {/* Contenido de las pestañas */}
      <div className="tab-content">
        {/* Contenido para la pestaña 1 */}
        {activeTab === 0 && <div>Contenido de la pestaña 1</div>}
        {/* Contenido para la pestaña 2 */}
        {activeTab === 1 && <div>Contenido de la pestaña 2</div>}
      </div>
    </div>
  );
};

export default Tabs;
