import React, { useState, useRef, useEffect } from "react";

const OrthomosaicViewer = ({
  isOpen,
  onClose,
  resultUrl,
  taskStatus,
  panelData,
  onSwitchToCogViewer,
}) => {
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef(null);
  const containerRef = useRef(null);

  const handleImageLoad = () => {
    setIsImageLoaded(true);
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((prev) => Math.min(Math.max(prev * delta, 0.1), 5));
  };

  const resetView = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const zoomIn = () => {
    setZoom((prev) => Math.min(prev * 1.2, 5));
  };

  const zoomOut = () => {
    setZoom((prev) => Math.max(prev * 0.8, 0.1));
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e) => handleMouseMove(e);
    const handleGlobalMouseUp = () => handleMouseUp();

    if (isDragging) {
      document.addEventListener("mousemove", handleGlobalMouseMove);
      document.addEventListener("mouseup", handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleGlobalMouseMove);
      document.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [isDragging, dragStart]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
      <div className="relative w-full h-full max-w-7xl max-h-screen m-4">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 bg-black bg-opacity-75 text-white p-4 z-10">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">Orthomosaic Result</h2>
              <p className="text-sm text-gray-300">
                Task ID: {taskStatus?.id} | Images: {taskStatus?.imagesCount}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-300 text-2xl p-2"
            >
              ×
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="absolute top-20 right-4 bg-black bg-opacity-75 text-white p-3 rounded-lg z-10">
          <div className="flex flex-col gap-2">
            <button
              onClick={zoomIn}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
            >
              Zoom In
            </button>
            <button
              onClick={zoomOut}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
            >
              Zoom Out
            </button>
            <button
              onClick={resetView}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
            >
              Reset
            </button>
            {onSwitchToCogViewer && (
              <button
                onClick={onSwitchToCogViewer}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-sm transition-colors"
              >
                Map View
              </button>
            )}
            <div className="text-xs text-center text-gray-300 mt-2">
              Zoom: {Math.round(zoom * 100)}%
            </div>
          </div>
        </div>

        {/* Image Container */}
        <div
          ref={containerRef}
          className="w-full h-full flex items-center justify-center overflow-hidden cursor-move"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
        >
          {/* Loading State - ZIP Processing */}
          {taskStatus?.isLoading && (
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto mb-6"></div>
              <h3 className="text-xl font-semibold mb-2">
                Processing Orthomosaic
              </h3>
              <p className="text-gray-300 mb-4">
                {taskStatus.loadingMessage ||
                  "Downloading and extracting thermal orthomosaic..."}
              </p>
              <div className="bg-gray-800 rounded-lg p-4 max-w-md mx-auto">
                <p className="text-sm text-gray-400 mb-2">
                  This may take a few moments:
                </p>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Downloading ZIP file from NodeODM</li>
                  <li>• Extracting orthomosaic image</li>
                  <li>• Uploading to cloud storage</li>
                </ul>
              </div>
            </div>
          )}

          {/* Error State */}
          {taskStatus?.error && !taskStatus?.isLoading && (
            <div className="text-white text-center">
              <svg
                className="w-16 h-16 mx-auto mb-4 text-red-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <h3 className="text-xl font-semibold mb-2 text-red-400">
                Processing Failed
              </h3>
              <p className="text-gray-300 mb-4">{taskStatus.error}</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {/* Image Loading State */}
          {!taskStatus?.isLoading &&
            !taskStatus?.error &&
            resultUrl &&
            !isImageLoaded && (
              <div className="text-white text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-2 border-white border-t-transparent mx-auto mb-4"></div>
                <p>Loading orthomosaic image...</p>
              </div>
            )}

          {/* Actual Image */}
          {!taskStatus?.isLoading && !taskStatus?.error && resultUrl && (
            <img
              ref={imageRef}
              src={resultUrl}
              alt="Orthomosaic Result"
              className={`max-w-none select-none transition-opacity duration-300 ${
                isImageLoaded ? "opacity-100" : "opacity-0"
              }`}
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                cursor: isDragging ? "grabbing" : "grab",
              }}
              onLoad={handleImageLoad}
              onError={() => {
                console.error("Failed to load orthomosaic image");
                setIsImageLoaded(true);
              }}
              draggable={false}
            />
          )}
        </div>

        {/* Panel Data Banners */}
        {!taskStatus?.isLoading && !taskStatus?.error && (
          <div className="absolute top-20 left-4 right-4 z-20 flex justify-center">
            {panelData === null && (
              <div className="text-sm text-yellow-300 text-center py-3 px-4 bg-yellow-900 bg-opacity-90 rounded-lg border border-yellow-700">
                AI is still processing panel data...
              </div>
            )}
            {Array.isArray(panelData) && panelData.length === 0 && (
              <div className="text-sm text-green-300 text-center py-3 px-4 bg-green-900 bg-opacity-90 rounded-lg border border-green-700">
                There are no unhealthy panels.
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="absolute bottom-4 left-4 bg-black bg-opacity-75 text-white p-3 rounded-lg text-sm">
          <p className="mb-1">🖱️ Drag to pan</p>
          <p className="mb-1">🖱️ Scroll to zoom</p>
          <p>📱 Use controls to navigate</p>
        </div>

        {/* Download Button */}
        {resultUrl && !taskStatus?.isLoading && !taskStatus?.error && (
          <div className="absolute bottom-4 right-4">
            <a
              href={resultUrl}
              download={`thermal-orthomosaic-${taskStatus?.id}.png`}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
              Download
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrthomosaicViewer;
