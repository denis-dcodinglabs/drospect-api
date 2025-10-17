const TempPanelCard = ({
  item,
  isHovered,
  onHover,
  onLeave,
  isRgbImage = false,
}) => {
  const shouldShowReason =
    Boolean(item?.reasonDetected) && (item?.reasonConfidence ?? 0) >= 0.5;
  const defectLabel = shouldShowReason ? item.reasonDetected : `Defect`;
  return (
    <div
      className={`grid grid-cols-1 bg-background shadow-md rounded-lg p-2 mb-2 transition-all transform cursor-pointer ${
        isHovered ? "scale-105 border-2 shadow-lg" : "hover:scale-105"
      }`}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-bold ">{defectLabel}:</span>
        <span className="text-blue-600">{item.panelNumber}</span>
      </div>
      {/* Only show temperature fields if they have meaningful values (not 0) */}
      {item.highestTemp > 0 && (
        <div className="flex items-center justify-between mb-1">
          <span className="font-bold ">Highest Temp:</span>
          <span className="text-red-500">{item.highestTemp}°C</span>
        </div>
      )}
      {item.avgTemp > 0 && (
        <div className="flex items-center justify-between mb-1">
          <span className="font-bold ">Avg Temp:</span>
          <span className="text-green-500">{item.avgTemp}°C</span>
        </div>
      )}
      {item.deltaTemp > 0 && (
        <div className="flex items-center justify-between">
          <span className="font-bold ">Delta:</span>
          <span className="text-purple-500">{item.deltaTemp}°C</span>
        </div>
      )}
      {/* Only show confidence for thermal images, hide for RGB images */}
      {!isRgbImage && item.coordinates?.confidence !== undefined && (
        <div className="flex items-center justify-between">
          <span className="font-bold ">Confidence:</span>
          <span className="text-yellow-500">
            {(item.coordinates.confidence * 100).toFixed(1)}%
          </span>
        </div>
      )}
      {/* Show source model if available */}
      {item.source_model && (
        <div className="flex items-center justify-between">
          <span className="font-bold ">Model:</span>
          <span
            className={`font-semibold ${
              item.source_model === "LOW"
                ? "text-red-500"
                : item.source_model === "HIGH"
                ? "text-orange-500"
                : "text-gray-500"
            }`}
          >
            {item.source_model}
          </span>
        </div>
      )}
    </div>
  );
};

export default TempPanelCard;
