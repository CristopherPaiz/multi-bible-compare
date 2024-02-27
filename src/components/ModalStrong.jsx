import PropTypes from "prop-types";
import Tabs from "./Tabs";

const ModalStrong = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="z-[9999] fixed inset-0 overflow-y-auto flex justify-center items-center">
      <div className="absolute z-40 inset-0 bg-black/60"></div>
      <div className="absolute z-50 flex justify-center items-center inset-0 ">
        <div className="relative bg-white w-[90%] min-w-[200px] sm:min-w-[300px] sm:w-[500px] h-[85%] sm:h-[85%] p-2 rounded-lg shadow-lg dark:bg-gray-800 dark:text-white overflow-y-scroll no-scrollbar">
          <div className="absolute top-0 right-0">
            <button
              onClick={onClose}
              className="bg-gray-200 text-gray-600 rounded-full w-8 h-8 mt-4 mr-4 flex items-center justify-center hover:bg-gray-300 focus:outline-none focus:ring focus:ring-gray-400 dark:bg-black dark:text-gray-400"
            >
              &times;
            </button>
          </div>
          <div className="min-w-full w-full pl-4 pr-3">
            <h2 className="text-xl mt-3 font-semibold mb-4">Diccionario Strong</h2>
            <Tabs />
          </div>
          <div className="bg-white h-6 dark:bg-gray-800 dark:text-white sticky ml-4 -bottom-4 w-[92%] sm:w-[95%] sm:ml-[14px] border-1 border-t m-auto border-gray-300 dark:border-gray-600 "></div>
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
