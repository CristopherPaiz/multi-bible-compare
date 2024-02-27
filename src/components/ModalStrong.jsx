import PropTypes from "prop-types";
import Tabs from "./Tabs";

const ModalStrong = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="z-[9999] fixed inset-0 overflow-y-auto flex justify-center items-center">
      <div className="absolute z-40 inset-0 bg-black/50"></div>
      <div className="absolute z-50 flex justify-center items-center inset-0">
        <div className="relative bg-white w-[80%] min-w-[200px] sm:min-w-[300px] sm:w-[500px] h-3/4 sm:h-[85%] p-8 rounded-lg shadow-lg">
          <div className="absolute top-0 right-0">
            <button
              onClick={onClose}
              className="bg-gray-200 text-gray-600 rounded-full w-8 h-8 mt-3 mr-3 flex items-center justify-center hover:bg-gray-300 focus:outline-none focus:ring focus:ring-gray-400"
            >
              &times;
            </button>
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-4">
              Diccionario Strong
              <p />
              Griego - Hebreo
            </h2>
            <p className="text-gray-700 mt-14">Próximamente...</p>
            <Tabs />
          </div>
        </div>
      </div>
    </div>
  );
};

ModalStrong.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default ModalStrong;
