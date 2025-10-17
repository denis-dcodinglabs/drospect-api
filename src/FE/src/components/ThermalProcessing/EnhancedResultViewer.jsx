import React, { useState, useEffect } from "react";
import OrthomosaicViewer from "./OrthomosaicViewer";
import CogTileViewer from "./CogTileViewer";
import axiosInstance from "../../axiosInstance";

const EnhancedResultViewer = ({ isOpen, onClose, resultUrl, taskStatus }) => {
  const [cogAvailable, setCogAvailable] = useState(false);
  const [viewerType, setViewerType] = useState("auto"); // "auto", "image", "cog"
  const [isCheckingCog, setIsCheckingCog] = useState(false);
  const [panelData, setPanelData] = useState(null);
  const [isLoadingPanelData, setIsLoadingPanelData] = useState(false);

  // Check for COG availability and load panel data when viewer opens
  useEffect(() => {
    if (isOpen && taskStatus?.id) {
      checkCogAvailability();
      loadPanelData();
    }
  }, [isOpen, taskStatus?.id]);

  const loadPanelData = async () => {
    if (!taskStatus?.id) return;

    setIsLoadingPanelData(true);
    try {
      const response = await axiosInstance.getData(
        `/orthomosaic-processing/${taskStatus.id}/panel-data`,
      );

      if (response.success && response.panelData) {
        setPanelData(response.panelData);
      } else {
        setPanelData(null);
      }
    } catch (error) {
      console.log("Failed to load panel data:", error.message);
      setPanelData(null);
    } finally {
      setIsLoadingPanelData(false);
    }
  };

  const checkCogAvailability = async () => {
    if (!taskStatus?.id) return;

    setIsCheckingCog(true);
    try {
      const response = await axiosInstance.getData(
        `/tiles/${taskStatus.id}/info`,
      );

      if (!response.error && (response.data || response)) {
        const info = response.data || response;
        setCogAvailable(!!info.cogUrl);

        // Auto-select COG viewer if available, fallback to image viewer
        if (info.cogUrl) {
          setViewerType("cog");
        } else {
          setViewerType("image");
        }
      } else {
        setCogAvailable(false);
        setViewerType("image");
      }
    } catch (error) {
      console.log("COG not available, using image viewer:", error.message);
      setCogAvailable(false);
      setViewerType("image");
    } finally {
      setIsCheckingCog(false);
    }
  };

  const handleSwitchToImageViewer = () => {
    setViewerType("image");
  };

  const handleSwitchToCogViewer = () => {
    setViewerType("cog");
  };

  const handleClose = () => {
    setViewerType("auto");
    setCogAvailable(false);
    setPanelData(null);
    onClose();
  };

  if (!isOpen) return null;

  // Show loading state while checking COG availability or loading panel data
  if (isCheckingCog || isLoadingPanelData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-white border-t-transparent mx-auto mb-4"></div>
          <p>
            {isCheckingCog
              ? "Checking tile data availability..."
              : "Loading panel data..."}
          </p>
        </div>
      </div>
    );
  }

  // Render appropriate viewer based on selection
  if (viewerType === "cog" && cogAvailable) {
    return (
      <CogTileViewer
        isOpen={isOpen}
        onClose={handleClose}
        taskId={taskStatus?.id}
        taskStatus={taskStatus}
        panelData={panelData}
      />
    );
  }

  // Fallback to original image viewer (with option to switch to COG if available)
  return (
    <OrthomosaicViewer
      isOpen={isOpen}
      onClose={handleClose}
      resultUrl={resultUrl}
      taskStatus={taskStatus}
      panelData={panelData}
      onSwitchToCogViewer={cogAvailable ? handleSwitchToCogViewer : null}
    />
  );
};

export default EnhancedResultViewer;
