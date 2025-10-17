import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";
import "./HeatMap.css";

const HeatMapLayer = ({ heatData = [], options = {}, visible = true }) => {
  const map = useMap();
  const heatLayerRef = useRef(null);

  useEffect(() => {
    if (!visible || !heatData.length) {
      // Remove existing layer if not visible or no data
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
      return;
    }

    // Remove existing layer before creating new one
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
    }

    // Default heat map options with nice thermal-like gradient
    const defaultOptions = {
      radius: 25,
      blur: 15,
      maxZoom: 18,
      max: 1.0,
      gradient: {
        0.0: "#0066FF", // Cool blue for normal temps
        0.3: "#00FFFF", // Cyan for mild heating
        0.5: "#00FF00", // Green for moderate
        0.6: "#FFFF00", // Yellow for warm
        0.8: "#FF8000", // Orange for hot
        1.0: "#FF0000", // Red for extreme heat
      },
    };

    const mergedOptions = { ...defaultOptions, ...options };

    // Validate and process heat data to ensure proper coordinate format
    const processedHeatData = heatData
      .filter((point) => {
        // Ensure we have valid coordinates and intensity
        return (
          Array.isArray(point) &&
          point.length >= 3 &&
          typeof point[0] === "number" &&
          typeof point[1] === "number" &&
          typeof point[2] === "number" &&
          !isNaN(point[0]) &&
          !isNaN(point[1]) &&
          !isNaN(point[2])
        );
      })
      .map((point) => {
        // Ensure coordinates are in the correct order [lat, lng, intensity]
        return [
          parseFloat(point[0]), // latitude
          parseFloat(point[1]), // longitude
          parseFloat(point[2]), // intensity
        ];
      });

    if (processedHeatData.length === 0) {
      return;
    }

    // Create the heat layer with processed data
    const heatLayer = L.heatLayer(processedHeatData, mergedOptions);

    // Store reference
    heatLayerRef.current = heatLayer;

    // Custom onAdd to handle proper positioning and zoom events
    const originalOnAdd = heatLayer.onAdd;
    heatLayer.onAdd = function (map) {
      const result = originalOnAdd.call(this, map);

      // Add CSS class for animations
      if (this._canvas) {
        this._canvas.parentElement.classList.add("leaflet-heatmap-layer");

        // Add high intensity class for special effects if max intensity is high
        const maxIntensity = Math.max(
          ...processedHeatData.map((point) => point[2] || 0),
        );
        if (maxIntensity > 0.8) {
          this._canvas.parentElement.classList.add("high-intensity");
        }
      }

      // Handle zoom events to ensure proper positioning
      const onZoomEnd = () => {
        if (this._canvas && this._map) {
          // Force redraw on zoom to maintain correct positioning
          this._redraw();
        }
      };

      const onViewReset = () => {
        if (this._canvas && this._map) {
          // Update canvas position on view reset
          this._reset();
        }
      };

      // Bind zoom events
      map.on("zoomend", onZoomEnd);
      map.on("viewreset", onViewReset);

      // Store event handlers for cleanup
      this._zoomEndHandler = onZoomEnd;
      this._viewResetHandler = onViewReset;

      return result;
    };

    // Custom onRemove to clean up event handlers
    const originalOnRemove = heatLayer.onRemove;
    heatLayer.onRemove = function (map) {
      // Clean up event handlers
      if (this._zoomEndHandler) {
        map.off("zoomend", this._zoomEndHandler);
      }
      if (this._viewResetHandler) {
        map.off("viewreset", this._viewResetHandler);
      }

      return originalOnRemove.call(this, map);
    };

    // Add the layer to map
    heatLayer.addTo(map);

    // Cleanup function
    return () => {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
    };
  }, [map, heatData, options, visible]);

  // Additional effect to handle data changes without recreating the layer
  useEffect(() => {
    if (heatLayerRef.current && visible && heatData.length > 0) {
      // Process the data
      const processedHeatData = heatData
        .filter((point) => {
          return (
            Array.isArray(point) &&
            point.length >= 3 &&
            typeof point[0] === "number" &&
            typeof point[1] === "number" &&
            typeof point[2] === "number" &&
            !isNaN(point[0]) &&
            !isNaN(point[1]) &&
            !isNaN(point[2])
          );
        })
        .map((point) => [
          parseFloat(point[0]),
          parseFloat(point[1]),
          parseFloat(point[2]),
        ]);

      // Update the layer data if it exists
      if (heatLayerRef.current.setLatLngs) {
        heatLayerRef.current.setLatLngs(processedHeatData);
      }
    }
  }, [heatData, visible]);

  return null; // This component doesn't render anything directly
};

export default HeatMapLayer;
