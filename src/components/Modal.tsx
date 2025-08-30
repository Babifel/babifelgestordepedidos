import React from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: "success" | "error" | "info" | "warning";
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type = "info",
}) => {
  if (!isOpen) return null;

  const getModalStyles = () => {
    switch (type) {
      case "success":
        return {
          icon: (
            <svg
              width="44"
              height="44"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M20 6L9 17L4 12"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ),
          bgColor: "bg-green-500/20",
          borderColor: "border-green-500/30",
          textColor: "text-green-400",
        };
      case "error":
        return {
          icon: "❌",
          bgColor: "bg-red-500/20",
          borderColor: "border-red-500/30",
          textColor: "text-red-400",
        };
      case "warning":
        return {
          icon: "⚠️",
          bgColor: "bg-yellow-500/20",
          borderColor: "border-yellow-500/30",
          textColor: "text-yellow-400",
        };
      default:
        return {
          icon: "ℹ️",
          bgColor: "bg-blue-500/20",
          borderColor: "border-blue-500/30",
          textColor: "text-blue-400",
        };
    }
  };

  const styles = getModalStyles();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl border border-purple-500/20 max-w-md w-full mx-4 shadow-2xl">
        <div className="p-6">
          <div className="flex items-center justify-center mb-4">
            <div
              className={`w-16 h-16 rounded-full ${styles.bgColor} ${styles.borderColor} border-2 flex items-center justify-center text-2xl`}
            >
              {styles.icon}
            </div>
          </div>

          <div className="text-center">
            <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
            <p className={`text-sm ${styles.textColor} mb-6`}>{message}</p>
          </div>

          <div className="flex justify-center">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors duration-200 font-medium"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
