import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay, faFilePdf, faSearch } from "@fortawesome/free-solid-svg-icons";
import Edit from "../assets/icons/Edit";
import Upload from "../assets/icons/Upload";
import ThermalUploadButton from "./ThermalProcessing/ThermalUploadButton";

const ProjectActions = ({
  project,
  loadingFile,
  loadingPdf,
  statistics,
  items,
  handleCloseDelete,
  handleEdit,
  setMorePhoto,
  handleGeneratePdf,
  handlePreviewPdf,
  isUploading,
  isModalUpload,
  // Thermal processing props
  onThermalUploadStart,
  isThermalProcessingDisabled,
  handleClassification,
  loadingClassification,
  onOpenAIProcessingModal,
}) => {
  const isDisabled = isUploading && !isModalUpload;

  return (
    <div className="w-full md:w-[60%] flex flex-wrap md:flex-row justify-center items-center md:justify-end md:items-start gap-4">
      <button
        className={`flex justify-between items-center gap-3 px-3 py-1.5 rounded-md group text-base 
          ${
            project?.imagecounter === null ||
            project?.isinspected ||
            loadingFile ||
            project?.allrgb ||
            isDisabled
              ? "bg-gray-400 text-gray-500"
              : "bg-gradient-to-r from-gray-600 to-gray-500 hover:from-gray-500 hover:to-gray-400 text-gray-200 border border-gray-500 transition-all duration-200"
          }`}
        onClick={onOpenAIProcessingModal}
        disabled={
          project?.imagecounter === null ||
          project?.isinspected ||
          loadingFile ||
          project?.allrgb ||
          isDisabled
        }
      >
        <FontAwesomeIcon
          icon={faPlay}
          className={`${loadingFile ? "text-gray-500" : "text-gray-200"}`}
        />
        {loadingFile
          ? "Please wait..."
          : !project?.allrgb
          ? "Start AI processing"
          : "Can't start AI processing"}
      </button>

      {/* Classification button - for both RGB and thermal images */}
      {/* Removed Process RGB Images button as per new flow */}

      {/* Thermal Processing Button */}
      {project?.imagecounter > 0 && onThermalUploadStart && (
        <div className="thermal-upload-button-wrapper">
          <ThermalUploadButton
            projectId={project?.id}
            onUploadStart={onThermalUploadStart}
            disabled={isThermalProcessingDisabled || isDisabled}
          />
        </div>
      )}

      {project?.imagecounter > 0 && (
        <button
          className={`flex justify-between items-center gap-3 px-3 py-1.5 rounded-md group ${
            isDisabled
              ? "bg-gray-400 text-gray-500"
              : "bg-gradient-to-r from-gray-600 to-gray-500 hover:from-gray-500 hover:to-gray-400 text-gray-200 border border-gray-500 transition-all duration-200"
          }`}
          onClick={() => setMorePhoto((prev) => !prev)}
          disabled={isDisabled}
        >
          <Upload className="text-gray-200" />
          Upload images
        </button>
      )}

      <button
        className={`flex justify-between items-center gap-3 px-3 py-1.5 rounded-md group ${
          isDisabled
            ? "bg-gray-400 text-gray-500"
            : "bg-gradient-to-r from-gray-600 to-gray-500 hover:from-gray-500 hover:to-gray-400 text-gray-200 border border-gray-500 transition-all duration-200"
        }`}
        onClick={handleEdit}
        disabled={isDisabled}
      >
        <Edit width="18px" height="18px" fill="#E5E7EB" />
        Edit
      </button>

      {statistics && statistics?.unhealthyPanels > 0 && (
        <button
          disabled={loadingPdf || isDisabled}
          className={`flex justify-between items-center gap-3 px-3 py-1.5 rounded-md group text-base text-white ${
            loadingPdf || isDisabled
              ? "bg-gray-400 text-gray-500"
              : "bg-gray-700 hover:bg-gray-600 cursor-pointer"
          }`}
          onClick={handlePreviewPdf}
        >
          <FontAwesomeIcon icon={faFilePdf} className="text-white" />
          {loadingPdf ? "Generating..." : "Export"}
        </button>
      )}
    </div>
  );
};

export default ProjectActions;
