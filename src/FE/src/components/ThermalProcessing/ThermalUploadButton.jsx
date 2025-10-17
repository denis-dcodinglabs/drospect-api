import React, { useState } from "react";

const ThermalUploadButton = ({
  projectId,
  onUploadStart,
  disabled = false,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = () => {
    if (!disabled && !isLoading) {
      setIsLoading(true);
      onUploadStart();
      // Reset loading state after a brief delay
      setTimeout(() => setIsLoading(false), 1000);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={`flex justify-between items-center gap-3 px-3 py-1.5 rounded-md group text-base ${
        disabled || isLoading
          ? "bg-gray-400 text-gray-500"
          : "bg-gradient-to-r from-gray-600 to-gray-500 hover:from-gray-500 hover:to-gray-400 text-gray-200 border border-gray-500 transition-all duration-200"
      }`}
    >
      {isLoading ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
          Processing...
        </>
      ) : (
        <>
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          Ortho + AI
        </>
      )}
    </button>
  );
};

export default ThermalUploadButton;
