import React, { useState, useRef, useEffect } from "react";
import { Stage, Layer, Image as KonvaImage, Rect, Text } from "react-konva";
import useImage from "use-image";

const PanelBox = ({
  panel,
  imageWidth,
  imageHeight,
  originalImageWidth,
  originalImageHeight,
  isHovered,
  onHover,
  onLeave,
}) => {
  // Defensive programming: check if panel and coordinates exist
  if (!panel || !panel.coordinates) {
    console.warn("PanelBox: Missing panel or coordinates data", panel);
    return null;
  }

  const { coordinates, panelNumber } = panel;
  const { min_x, min_y, max_x, max_y } = coordinates;

  // Additional validation for coordinate values
  if (
    min_x === undefined ||
    min_y === undefined ||
    max_x === undefined ||
    max_y === undefined
  ) {
    console.warn("PanelBox: Missing coordinate values", coordinates);
    return null;
  }

  // Check if coordinates are relative (0-1 range) or absolute pixels
  const isRelative = max_x <= 1 && max_y <= 1 && min_x <= 1 && min_y <= 1;

  let x, y, width, height;

  if (isRelative) {
    // Convert relative coordinates to absolute pixel coordinates
    x = min_x * imageWidth;
    y = min_y * imageHeight;
    width = (max_x - min_x) * imageWidth;
    height = (max_y - min_y) * imageHeight;
  } else {
    // Coordinates are already in pixels, scale them to the displayed image size
    const scaleX = imageWidth / (originalImageWidth || imageWidth);
    const scaleY = imageHeight / (originalImageHeight || imageHeight);

    x = min_x * scaleX;
    y = min_y * scaleY;
    width = (max_x - min_x) * scaleX;
    height = (max_y - min_y) * scaleY;
  }

  return (
    <>
      <>
        {/* Main bounding box with neon colors */}
        <Rect
          x={x}
          y={y}
          width={width}
          height={height}
          stroke={
            isHovered
              ? "#ffff00"
              : panel.source_model === "LOW"
              ? "#ff0000"
              : panel.source_model === "HIGH"
              ? "#ffa500"
              : "#00ffff"
          }
          strokeWidth={isHovered ? 2 : 2}
          fill={
            isHovered
              ? "rgba(255, 255, 0, 0.1)"
              : panel.source_model === "LOW"
              ? "rgba(255, 0, 0, 0.1)"
              : panel.source_model === "HIGH"
              ? "rgba(255, 165, 0, 0.1)"
              : "rgba(0, 255, 0, 0.1)"
          }
          onMouseEnter={onHover}
          onMouseLeave={onLeave}
          zIndex={10}
        />
      </>

      {/* Label background */}
      {isHovered && (
        <>
          {(() => {
            // Dynamic label positioning
            // Only show reasonDetected if confidence >= 50%
            const shouldShowReason =
              panel.reasonDetected && panel.reasonConfidence >= 0.5;
            const labelText = shouldShowReason
              ? panel.reasonDetected
              : `Defect ${panelNumber}`;
            const labelWidth = shouldShowReason
              ? panel.reasonDetected.length * 8
              : 80;
            const labelHeight = 20;
            const padding = 5;

            let labelX, labelY;

            // Horizontal positioning
            if (x + labelWidth > imageWidth) {
              // Too close to right edge - align to right
              labelX = imageWidth - labelWidth - padding;
            } else if (x < padding) {
              // Too close to left edge - align to left
              labelX = padding;
            } else {
              // Default: align with panel
              labelX = x;
            }

            // Vertical positioning
            if (y - labelHeight - padding < 0) {
              // Too close to top edge - position below panel
              labelY = y + height + padding;
            } else {
              // Default: position above panel
              labelY = y - labelHeight - padding;
            }

            return (
              <>
                <Rect
                  x={labelX}
                  y={labelY}
                  width={labelWidth}
                  height={labelHeight}
                  fill="#00ffff"
                  cornerRadius={4}
                />
                <Text
                  x={labelX + 5}
                  y={labelY + 5}
                  text={labelText}
                  fontSize={14}
                  fill="black"
                  fontStyle="bold"
                />
              </>
            );
          })()}
        </>
      )}
    </>
  );
};

const ConfidenceTooltip = ({
  panel,
  imageWidth,
  imageHeight,
  originalImageWidth,
  originalImageHeight,
  isHovered,
  isRgbImage = false,
}) => {
  if (!isHovered || isRgbImage) return null; // Hide tooltip for RGB images

  // Defensive programming: check if panel and coordinates exist
  if (!panel || !panel.coordinates) {
    return null;
  }

  const { coordinates } = panel;
  const { min_x, min_y, max_x, max_y, confidence } = coordinates;

  // Additional validation for coordinate values
  if (
    min_x === undefined ||
    min_y === undefined ||
    max_x === undefined ||
    max_y === undefined
  ) {
    return null;
  }

  // Check if coordinates are relative (0-1 range) or absolute pixels
  const isRelative = max_x <= 1 && max_y <= 1 && min_x <= 1 && min_y <= 1;

  let x, y, width, height;

  if (isRelative) {
    // Convert relative coordinates to absolute pixel coordinates
    x = min_x * imageWidth;
    y = min_y * imageHeight;
    width = (max_x - min_x) * imageWidth;
    height = (max_y - min_y) * imageHeight;
  } else {
    // Coordinates are already in pixels, scale them to the displayed image size
    const scaleX = imageWidth / (originalImageWidth || imageWidth);
    const scaleY = imageHeight / (originalImageHeight || imageHeight);

    x = min_x * scaleX;
    y = min_y * scaleY;
    width = (max_x - min_x) * scaleX;
    height = (max_y - min_y) * scaleY;
  }

  // Tooltip dimensions
  const tooltipWidth = 120;
  const tooltipHeight = 25;
  const padding = 10;

  // Calculate dynamic positioning based on panel location
  let tooltipX, tooltipY;

  // Horizontal positioning
  if (x + width + tooltipWidth + padding > imageWidth) {
    // Too close to right edge - position to the left
    tooltipX = x - tooltipWidth - padding;
  } else if (x < tooltipWidth + padding) {
    // Too close to left edge - position to the right
    tooltipX = x + width + padding;
  } else {
    // Default: position to the right
    tooltipX = x + width + padding;
  }

  // Vertical positioning - always align with panel top
  tooltipY = y;

  // Ensure tooltip stays within horizontal bounds only
  tooltipX = Math.max(
    padding,
    Math.min(tooltipX, imageWidth - tooltipWidth - padding),
  );

  return (
    <>
      {/* Confidence tooltip background - positioned dynamically */}
      <Rect
        x={tooltipX}
        y={tooltipY}
        width={tooltipWidth}
        height={tooltipHeight}
        fill="#000000"
        cornerRadius={6}
        stroke="#ffff00"
        strokeWidth={2}
      />
      {/* Confidence tooltip text */}
      <Text
        x={tooltipX + 5}
        y={tooltipY + 8}
        text={`Confidence: ${(confidence * 100).toFixed(1)}%`}
        fontSize={12}
        fill="#ffff00"
        fontStyle="bold"
      />
    </>
  );
};

const ImageAnnotator = ({
  imageUrl,
  panelInformation = [],
  containerWidth,
  containerHeight,
  hoveredPanelId,
  onPanelHover,
  onPanelLeave,
  isRgbImage = false,
}) => {
  const [image] = useImage(imageUrl);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const stageRef = useRef();

  useEffect(() => {
    if (image && containerWidth && containerHeight) {
      // Calculate the scaled dimensions to fit the container while maintaining aspect ratio
      const imageAspectRatio = image.width / image.height;
      const containerAspectRatio = containerWidth / containerHeight;

      let scaledWidth, scaledHeight;

      if (imageAspectRatio > containerAspectRatio) {
        // Image is wider than container
        scaledWidth = containerWidth;
        scaledHeight = containerWidth / imageAspectRatio;
      } else {
        // Image is taller than container
        scaledHeight = containerHeight;
        scaledWidth = containerHeight * imageAspectRatio;
      }
      setDimensions({ width: scaledWidth, height: scaledHeight });
    }
  }, [image, containerWidth, containerHeight, panelInformation]);

  if (!image || !dimensions.width || !dimensions.height) {
    return (
      <div
        style={{
          width: containerWidth,
          height: containerHeight,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f0f0f0",
        }}
      >
        Loading image...
      </div>
    );
  }

  return (
    <div
      style={{
        width: containerWidth,
        height: containerHeight,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Stage width={dimensions.width} height={dimensions.height} ref={stageRef}>
        <Layer>
          <KonvaImage
            image={image}
            width={dimensions.width}
            height={dimensions.height}
          />
          {/* Render all bounding boxes first */}
          {panelInformation &&
            panelInformation.length > 0 &&
            panelInformation
              .filter(
                (panel) =>
                  panel &&
                  panel.coordinates &&
                  panel.coordinates.min_x !== undefined &&
                  panel.coordinates.min_y !== undefined &&
                  panel.coordinates.max_x !== undefined &&
                  panel.coordinates.max_y !== undefined,
              )
              .map((panel, index) => (
                <PanelBox
                  key={index}
                  panel={panel}
                  imageWidth={dimensions.width}
                  imageHeight={dimensions.height}
                  originalImageWidth={image.width}
                  originalImageHeight={image.height}
                  isHovered={hoveredPanelId === panel.panelNumber}
                  onHover={() => onPanelHover(panel.panelNumber)}
                  onLeave={onPanelLeave}
                />
              ))}

          {/* Render confidence tooltips on top */}
          {panelInformation &&
            panelInformation.length > 0 &&
            panelInformation
              .filter(
                (panel) =>
                  panel &&
                  panel.coordinates &&
                  panel.coordinates.min_x !== undefined &&
                  panel.coordinates.min_y !== undefined &&
                  panel.coordinates.max_x !== undefined &&
                  panel.coordinates.max_y !== undefined,
              )
              .map((panel, index) => (
                <ConfidenceTooltip
                  key={`tooltip-${index}`}
                  panel={panel}
                  imageWidth={dimensions.width}
                  imageHeight={dimensions.height}
                  originalImageWidth={image.width}
                  originalImageHeight={image.height}
                  isHovered={hoveredPanelId === panel.panelNumber}
                  isRgbImage={isRgbImage}
                />
              ))}
        </Layer>
      </Stage>
    </div>
  );
};

export default ImageAnnotator;
