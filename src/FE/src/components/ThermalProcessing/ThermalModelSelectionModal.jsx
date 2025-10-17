import React from "react";
import ModalLayout from "../ModalLayout";
import Button from "../formComponents/Button";

const ThermalModelSelectionModal = ({
  isOpen,
  onClose,
  onSelectModel,
  projectId,
  isLoading = false,
  credits = 0,
  thermalImageCount = 0,
  loadingText = null,
}) => {
  const [selectedModel, setSelectedModel] = React.useState("LOW");
  const [isButtonDisabled, setIsButtonDisabled] = React.useState(false);

  const handleModelSelection = () => {
    if (selectedModel) {
      onSelectModel(selectedModel, projectId);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalLayout
      open={isOpen}
      handleClose={onClose}
      className="w-[800px] md:w-[1000px] max-w-[95vw]"
    >
      <div className="flex w-full h-[600px] bg-gradient-to-br from-[#2e2154] to-[#1a1333] rounded-xl overflow-hidden shadow-2xl">
        {/* Left Side - Form */}
        <div className="w-1/2 p-8 flex flex-col justify-center">
          <div className="w-full">
            <h1 className="text-3xl font-bold mb-6 text-center text-white">
              Generate Orthomosaic & Run AI Inspection
            </h1>

            {/* Tip Section */}
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-900 to-purple-900 border border-blue-400 rounded-lg w-full">
              <div className="text-blue-200 text-sm text-center">
                <strong>Tip:</strong> For the best AI analysis, upload images
                taken from 15–20 m above ground.
              </div>
            </div>

            <form className="flex w-full flex-wrap items-center justify-center gap-y-5 gap-x-3">
              <div className="flex gap-y-4 w-full flex-col py-4 px-2">
                <label className="mr-4 flex items-center text-white text-sm bg-transparent hover:bg-white hover:bg-opacity-10 p-3 rounded-lg transition-all duration-200 cursor-pointer">
                  <input
                    type="radio"
                    value="LOW"
                    name="model"
                    checked={selectedModel === "LOW"}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    disabled={isLoading}
                    className="mr-3 w-5 h-5 text-primary accent-[#FC620A]"
                  />
                  <div>
                    <div className="font-semibold">
                      Ground Panels - Low Altitude Flight
                    </div>
                    <div className="text-gray-300 text-xs">
                      (15-20m above ground)
                    </div>
                  </div>
                </label>
              </div>

              {/* Image Count Information */}
              <div className="mb-6 p-4 bg-gradient-to-r from-purple-900 to-blue-900 border border-purple-400 rounded-lg w-full">
                <div className="text-purple-200 text-sm text-center">
                  <strong>{thermalImageCount}</strong> thermal images will be
                  processed from this project
                </div>
              </div>

              <Button
                type="button"
                onClick={handleModelSelection}
                text={
                  isLoading
                    ? loadingText || "Starting Processing..."
                    : "Start Ortho + AI Processing"
                }
                className="rounded-xl w-full mt-3 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-semibold text-lg py-4 shadow-lg transition-all duration-200 transform hover:scale-105"
                disabled={isLoading || isButtonDisabled}
              />
            </form>
          </div>
        </div>

        {/* Right Side - Orthomosaic Example */}
        <div className="w-1/2 bg-gradient-to-br from-blue-900 to-purple-900 flex flex-col relative overflow-hidden">
          {/* Orthomosaic Example - Top Half */}
          <div className="h-1/2 flex items-center justify-center">
            <div className="w-full h-full relative overflow-hidden">
              <img
                src="/ortho-example.png"
                alt="Orthomosaic Example"
                className="w-full h-full object-cover"
              />
              {/* Subtle overlay for better text readability */}
              <div className="absolute inset-0 bg-black bg-opacity-10"></div>
            </div>
          </div>

          {/* Content - Bottom Half */}
          <div className="h-1/2 p-6 flex flex-col justify-center items-center text-center">
            <h3 className="text-2xl font-bold text-white mb-3">
              Orthomosaic Result
            </h3>
            <p className="text-blue-200 text-sm leading-relaxed max-w-xs">
              Transform your drone images into a high-resolution orthomosaic map
              with AI-powered defect detection and thermal analysis.
            </p>

            {/* Feature highlights */}
            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-center text-green-300 text-sm">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                High-resolution mapping
              </div>
              <div className="flex items-center justify-center text-blue-300 text-sm">
                <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
                AI defect detection
              </div>
              <div className="flex items-center justify-center text-orange-300 text-sm">
                <div className="w-2 h-2 bg-orange-400 rounded-full mr-2"></div>
                Thermal analysis
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModalLayout>
  );
};

export default ThermalModelSelectionModal;
