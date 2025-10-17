import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  useMap,
  Polygon,
  Tooltip,
} from "react-leaflet";
import L from "leaflet";
import "leaflet-rotate";
import axiosInstance from "../../axiosInstance";
import { toast } from "react-toastify";
import {
  getFilteredAndSortedPanels,
  hasValidCoordinates,
  getPanelCenter,
} from "./spatialSortingUtils";

/*
 * FEATURES:
 * - Pixel-perfect polygon rendering using WGS84 coordinates
 * - Color-coded panels based on health status (Healthy, Unhealthy, Damaged, Hotspot)
 * - Interactive tooltips with panel information
 * - Adjustable opacity for both thermal layer and panel overlay
 * - Toggle controls for basemap and panel visibility
 * - Coordinate validation and error handling
 * - Spatial sorting for natural panel navigation (left-to-right, top-to-bottom)
 *
 * SPATIAL SORTING:
 * - Uses spatialSortingUtils.js for panel ordering logic
 * - Provides toggle between spatial and original processing order
 * - Groups panels by latitude bands and sorts within each row by longitude
 */

// Add CSS styles for panel tooltips and custom slider
const tooltipStyles = `
  .panel-tooltip {
    background: rgba(0, 0, 0, 0.9) !important;
    border: 2px solid #333 !important;
    border-radius: 8px !important;
    color: white !important;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
    font-size: 12px !important;
    padding: 8px 12px !important;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
    backdrop-filter: blur(4px) !important;
    min-width: 180px !important;
  }
  
  .panel-tooltip::before {
    border-top-color: #333 !important;
  }
  
  .panel-tooltip .leaflet-tooltip-content {
    margin: 0 !important;
  }

  .slider-thumb::-webkit-slider-thumb {
    appearance: none;
    height: 20px;
    width: 20px;
    border-radius: 50%;
    background: linear-gradient(145deg, #3b82f6, #1d4ed8);
    cursor: pointer;
    border: 2px solid #ffffff;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    transition: all 0.2s ease;
  }

  .slider-thumb::-webkit-slider-thumb:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4);
  }

  .slider-thumb::-moz-range-thumb {
    height: 20px;
    width: 20px;
    border-radius: 50%;
    background: linear-gradient(145deg, #3b82f6, #1d4ed8);
    cursor: pointer;
    border: 2px solid #ffffff;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    transition: all 0.2s ease;
  }

  .slider-thumb::-moz-range-thumb:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4);
  }

  /* Prevent scroll propagation on sidepanel */
  .cog-viewer-sidepanel {
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
  }
`;

// Inject styles into document head
if (typeof document !== "undefined") {
  const styleElement = document.createElement("style");
  styleElement.textContent = tooltipStyles;
  document.head.appendChild(styleElement);
}

// Custom TileLayer with Authentication
const AuthenticatedTileLayer = ({
  tileUrl,
  opacity = 1,
  attribution = "",
  isActive = true,
}) => {
  const map = useMap();
  const abortControllerRef = useRef(null);

  useEffect(() => {
    if (!tileUrl || !isActive) return;

    // Create abort controller for this tile layer
    abortControllerRef.current = new AbortController();

    // Create custom tile layer with authentication headers
    const CustomTileLayer = L.TileLayer.extend({
      createTile: function (coords, done) {
        const tile = document.createElement("img");

        const tileUrlWithCoords = this.getTileUrl(coords);

        // Set up authentication headers using fetch with abort signal
        fetch(tileUrlWithCoords, {
          headers: {
            Accept: "image/*",
          },
          signal: abortControllerRef.current?.signal,
        })
          .then((response) => {
            // if (!response.ok) {
            //   throw new Error(`HTTP ${response.status}`);
            // }
            if (response.ok) {
              return response.blob();
            }
            return null;
          })
          .then((blob) => {
            if (blob) {
              tile.src = URL.createObjectURL(blob);
              done(null, tile);
            } else {
              done(new Error("No blob received"), tile);
            }
          })
          .catch((error) => {
            // Don't log abort errors as they're expected when component unmounts
            if (error.name !== "AbortError") {
              console.warn("Tile fetch error:", error);
            }
            done(error, tile);
          });

        return tile;
      },
    });

    const tileLayer = new CustomTileLayer(tileUrl, {
      opacity: opacity,
      attribution: attribution,
      maxZoom: 50,
      tileSize: 256,
      zoomOffset: 0,
    });

    map.addLayer(tileLayer);

    return () => {
      // Abort any ongoing fetch requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      map.removeLayer(tileLayer);
    };
  }, [map, tileUrl, opacity, attribution, isActive]);

  return null;
};

// Component to fit map bounds to COG bounds
const FitBounds = ({ bounds }) => {
  const map = useMap();

  useEffect(() => {
    if (bounds && bounds.length === 4) {
      // bounds format: [minLng, minLat, maxLng, maxLat]
      const sw = L.latLng(bounds[1], bounds[0]); // southwest
      const ne = L.latLng(bounds[3], bounds[2]); // northeast
      map.fitBounds(L.latLngBounds(sw, ne), { padding: [20, 20] });
    }
  }, [map, bounds]);

  return null;
};

// Component to render solar panel polygons
const SolarPanelPolygons = ({
  panels,
  opacity = 0.7,
  taskId,
  currentPanelIndex = 0,
}) => {
  const map = useMap();
  const [mapBounds, setMapBounds] = useState(null);

  // Get current map bounds
  useEffect(() => {
    const updateBounds = () => {
      if (map) {
        const bounds = map.getBounds();
        setMapBounds({
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest(),
          center: map.getCenter(),
        });
      }
    };

    updateBounds();
    map.on("moveend", updateBounds);
    map.on("zoomend", updateBounds);

    return () => {
      map.off("moveend", updateBounds);
      map.off("zoomend", updateBounds);
    };
  }, [map]);

  // Removed auto-fit functionality to prevent interference with panel navigation

  if (!panels || panels.length === 0) return null;

  // Utility function to validate WGS84 coordinates
  const isValidCoordinate = (coord) => {
    return (
      coord &&
      typeof coord.lat === "number" &&
      typeof coord.lon === "number" &&
      coord.lat >= -90 &&
      coord.lat <= 90 &&
      coord.lon >= -180 &&
      coord.lon <= 180
    );
  };

  // Utility function to check if polygon is within map bounds
  const isPolygonInBounds = (polygonPoints) => {
    if (!mapBounds || !polygonPoints || polygonPoints.length === 0)
      return false;

    const lats = polygonPoints.map((p) => p[0]);
    const lngs = polygonPoints.map((p) => p[1]);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    // Check if polygon bounds overlap with map bounds
    const inBounds = !(
      maxLat < mapBounds.south ||
      minLat > mapBounds.north ||
      maxLng < mapBounds.west ||
      minLng > mapBounds.east
    );

    return inBounds;
  };

  // Utility function to create pixel-perfect polygon from top-left coordinate and dimensions
  const createPixelPerfectPolygon = (panel) => {
    const wgs84Points = panel.wgs84_points || [];
    console.log(wgs84Points, "nedim3333");

    if (wgs84Points.length < 4) {
      console.warn(
        `Panel ${panel.index} has insufficient WGS84 points:`,
        wgs84Points,
      );
      return null;
    }

    // Validate all coordinates
    const validPoints = wgs84Points.filter(isValidCoordinate);
    if (validPoints.length < 4) {
      console.warn(
        `Panel ${panel.index} has invalid coordinates:`,
        wgs84Points,
      );
      return null;
    }

    // Convert WGS84 points to Leaflet polygon format [lat, lng]
    // Ensure proper polygon winding order (clockwise for Leaflet)
    const polygonPoints = validPoints.map((point) => [point.lat, point.lon]);

    // If we have exactly 4 points, ensure they form a proper rectangle
    if (polygonPoints.length === 4) {
      // Sort points to ensure proper winding order
      const sortedPoints = sortPolygonPoints(polygonPoints);
      return sortedPoints;
    }

    return polygonPoints;
  };

  // Utility function to sort polygon points for proper winding order
  const sortPolygonPoints = (points) => {
    if (points.length !== 4) return points;

    // Calculate centroid
    const centerLat = points.reduce((sum, p) => sum + p[0], 0) / 4;
    const centerLng = points.reduce((sum, p) => sum + p[1], 0) / 4;

    // Sort points by angle from centroid (clockwise)
    const sortedPoints = points.sort((a, b) => {
      const angleA = Math.atan2(a[0] - centerLat, a[1] - centerLng);
      const angleB = Math.atan2(b[0] - centerLat, b[1] - centerLng);
      return angleA - angleB;
    });

    return sortedPoints;
  };

  // Debug function to log bounds comparison
  const logBoundsComparison = (panel, polygonPoints) => {
    if (!mapBounds || !polygonPoints) return;

    const lats = polygonPoints.map((p) => p[0]);
    const lngs = polygonPoints.map((p) => p[1]);

    const panelBounds = {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs),
    };

    console.log(`Panel ${panel.index} bounds comparison:`, {
      panel: panelBounds,
      map: mapBounds,
      inBounds: isPolygonInBounds(polygonPoints),
      center: mapBounds.center,
    });
  };

  return panels.map((panel, index) => {
    const polygonPoints = createPixelPerfectPolygon(panel);

    if (!polygonPoints) {
      return null;
    }

    // Log bounds comparison for debugging
    logBoundsComparison(panel, polygonPoints);

    // Check if polygon is in current map bounds
    const inBounds = isPolygonInBounds(polygonPoints);

    // Check if this is the currently selected panel
    const isSelected = index === currentPanelIndex;

    // Determine color based on panel health status and source model
    let fillColor = "#00ff00"; // Default green for healthy
    let borderColor = "#008000";

    // Primary color logic based on panel class
    if (panel.class === "Unhealthy") {
      fillColor = "#ff0000"; // Red for unhealthy
      borderColor = "#cc0000";
    } else if (panel.class === "Damaged") {
      fillColor = "#ff6600"; // Orange for damaged
      borderColor = "#cc5200";
    } else if (panel.class === "Hotspot") {
      fillColor = "#ff00ff"; // Magenta for hotspot
      borderColor = "#cc00cc";
    } else if (panel.class === "Healthy") {
      fillColor = "#00ff00"; // Green for healthy
      borderColor = "#00cc00";
    }

    // Override colors based on source_model if present
    if (panel.source_model) {
      if (panel.source_model === "LOW") {
        fillColor = "#ff0000"; // Red for LOW model
        borderColor = "#cc0000";
      } else if (panel.source_model === "HIGH") {
        fillColor = "#ffa500"; // Orange for HIGH model
        borderColor = "#cc8400";
      }
    }

    return (
      <Polygon
        key={`panel-${panel.index || index}`}
        positions={polygonPoints}
        pathOptions={{
          fillColor: fillColor,
          color: isSelected ? "#ffff00" : borderColor, // Yellow border for selected panel
          weight: isSelected ? 4 : 2, // Thicker border for selected panel
          opacity: 1,
          fillOpacity: inBounds ? opacity : 0.3, // Reduce opacity if not in bounds
        }}
        eventHandlers={{
          mouseover: (e) => {
            const layer = e.target;
            layer.setStyle({
              weight: 3,
              fillOpacity: 0.8,
            });
          },
          mouseout: (e) => {
            const layer = e.target;
            layer.setStyle({
              weight: 2,
              fillOpacity: inBounds ? opacity : 0.3,
            });
          },
        }}
      >
        <Tooltip
          permanent={false}
          direction="top"
          offset={[0, -10]}
          className="panel-tooltip"
        >
          <div className="text-sm font-medium">
            <div className="font-bold">
              {(() => {
                const model = String(panel?.source_model || "").toUpperCase();
                const hasValidClassification =
                  model === "LOW" &&
                  typeof panel?.classification === "string" &&
                  panel.classification.trim().length > 0 &&
                  panel.classification.trim().toLowerCase() !== "unknown";

                // Prefer backend-provided title if available
                if (
                  typeof panel?.title === "string" &&
                  panel.title.length > 0
                ) {
                  return panel.title;
                }

                return hasValidClassification
                  ? `${panel.classification} #${panel.index}`
                  : `Defect #${panel.index}`;
              })()}
            </div>
            <div className="mt-1">
              <span
                className={`inline-block w-3 h-3 rounded-full mr-2 ${
                  panel.class === "Unhealthy"
                    ? "bg-red-500"
                    : panel.class === "Damaged"
                    ? "bg-orange-500"
                    : panel.class === "Hotspot"
                    ? "bg-pink-500"
                    : "bg-green-500"
                }`}
              ></span>
              {panel.class}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Confidence: {(panel.confidence * 100).toFixed(1)}%
            </div>

            {panel.isUnhealthy !== undefined && (
              <div className="text-xs text-gray-600">
                Status: {panel.isUnhealthy ? "Unhealthy" : "Healthy"}
              </div>
            )}
            <div className="text-xs text-gray-400 mt-1">
              Coordinates: {panel.wgs84_points?.[0]?.lat?.toFixed(6)},{" "}
              {panel.wgs84_points?.[0]?.lon?.toFixed(6)}
            </div>
            <div
              className={`text-xs mt-1 ${
                inBounds ? "text-green-400" : "text-red-400"
              }`}
            >
              {inBounds ? "✓ In View" : "✗ Out of View"}
            </div>
          </div>
        </Tooltip>
      </Polygon>
    );
  });
};

const CogTileViewer = ({
  isOpen,
  onClose,
  taskId,
  taskStatus,
  onSwitchToImageViewer,
  panelData,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tileJson, setTileJson] = useState(null);
  const [opacity, setOpacity] = useState(1);
  const [showBasemap, setShowBasemap] = useState(true);
  const [basemapType, setBasemapType] = useState("satellite");
  const [showPanels, setShowPanels] = useState(true);
  const [panelOpacity, setPanelOpacity] = useState(0.7);
  const [selectedSourceModel, setSelectedSourceModel] = useState("all");
  const [currentPanelIndex, setCurrentPanelIndex] = useState(0);
  const [bearing, setBearing] = useState(0);
  const [isRotateMode, setIsRotateMode] = useState(false);
  // Spatial ordering is always enabled by default
  const useSpatialOrder = true;
  const mapRef = useRef(null);
  const sidepanelRef = useRef(null);
  const [isMouseOverSidepanel, setIsMouseOverSidepanel] = useState(false);
  const isRotatingRef = useRef(false);
  const startAngleRef = useRef(0);
  const initialBearingRef = useRef(0);

  // Function to fit map to panel bounds
  const fitToPanels = useCallback(() => {
    if (!mapRef.current || !panelData || panelData.length === 0) return;

    const map = mapRef.current;
    const validPanels = panelData.filter(hasValidCoordinates);

    if (validPanels.length > 0) {
      // Calculate bounds that include all panels
      let minLat = Infinity,
        maxLat = -Infinity;
      let minLng = Infinity,
        maxLng = -Infinity;

      validPanels.forEach((panel) => {
        panel.wgs84_points.forEach((point) => {
          minLat = Math.min(minLat, point.lat);
          maxLat = Math.max(maxLat, point.lat);
          minLng = Math.min(minLng, point.lon);
          maxLng = Math.max(maxLng, point.lon);
        });
      });

      // Add some padding around the panels
      const latPadding = (maxLat - minLat) * 0.1;
      const lngPadding = (maxLng - minLng) * 0.1;

      const panelBounds = L.latLngBounds(
        [minLat - latPadding, minLng - lngPadding],
        [maxLat + latPadding, maxLng + lngPadding],
      );

      // Fit map to panel bounds
      map.fitBounds(panelBounds, { padding: [20, 20] });

      console.log("Manually fitted map to panels:", {
        panelBounds: {
          minLat: minLat - latPadding,
          maxLat: maxLat + latPadding,
          minLng: minLng - lngPadding,
          maxLng: maxLng + lngPadding,
        },
        panelsCount: validPanels.length,
      });
    }
  }, [panelData]);

  // Get filtered panels based on source model and apply spatial sorting
  const getFilteredPanels = useCallback(() => {
    return getFilteredAndSortedPanels(
      panelData,
      selectedSourceModel,
      useSpatialOrder,
    );
  }, [panelData, selectedSourceModel, useSpatialOrder]);

  // Focus map on specific panel
  const focusOnPanel = useCallback((panel) => {
    if (!mapRef.current || !panel?.wgs84_points) return;

    const map = mapRef.current;
    const panelCenter = getPanelCenter(panel);

    if (!panelCenter) return;

    const points = panel.wgs84_points;

    // Calculate panel bounds
    const lats = points.map((p) => p.lat);
    const lngs = points.map((p) => p.lon);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    // Use the calculated center from utility function
    const { centerLat, centerLng } = panelCenter;

    // Calculate panel size
    const latSize = maxLat - minLat;
    const lngSize = maxLng - minLng;

    // Use a consistent zoom level for all panels to avoid zoom jumping
    // This provides a good close-up view of individual panels
    const zoomLevel = 22;

    console.log("Focusing on panel:", {
      panelId: panel.index,
      center: [centerLat, centerLng],
      zoomLevel: zoomLevel,
      panelSize: { latSize, lngSize },
    });

    // Set the map view with calculated center and zoom
    map.setView([centerLat, centerLng], zoomLevel, {
      animate: true,
      duration: 0.5,
    });
  }, []);

  // Navigation functions
  const goToNextPanel = useCallback(() => {
    const filtered = getFilteredPanels();
    if (currentPanelIndex < filtered.length - 1) {
      const newIndex = currentPanelIndex + 1;
      setCurrentPanelIndex(newIndex);
      focusOnPanel(filtered[newIndex]);
    }
  }, [currentPanelIndex, getFilteredPanels, focusOnPanel]);

  const goToPreviousPanel = useCallback(() => {
    if (currentPanelIndex > 0) {
      const newIndex = currentPanelIndex - 1;
      setCurrentPanelIndex(newIndex);
      const filtered = getFilteredPanels();
      focusOnPanel(filtered[newIndex]);
    }
  }, [currentPanelIndex, getFilteredPanels, focusOnPanel]);

  // Reset current panel index when source model changes and focus on first panel
  useEffect(() => {
    setCurrentPanelIndex(0);
    // Focus on first panel after a short delay to ensure filtered panels are ready
    const timer = setTimeout(() => {
      const filteredPanels = getFilteredPanels();
      if (filteredPanels.length > 0) {
        focusOnPanel(filteredPanels[0]);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [selectedSourceModel, getFilteredPanels, focusOnPanel]);

  // Add sidepanel scroll event handling
  useEffect(() => {
    const sidepanel = sidepanelRef.current;
    if (!sidepanel) return;

    const handleSidepanelWheel = (event) => {
      // Prevent scroll from propagating to parent containers
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      return false;
    };

    const handleSidepanelScroll = (event) => {
      // Prevent scroll from propagating to parent containers
      event.stopPropagation();
    };

    sidepanel.addEventListener("wheel", handleSidepanelWheel, {
      passive: false,
    });
    sidepanel.addEventListener("scroll", handleSidepanelScroll, {
      passive: false,
    });

    return () => {
      sidepanel.removeEventListener("wheel", handleSidepanelWheel);
      sidepanel.removeEventListener("scroll", handleSidepanelScroll);
    };
  }, []);

  // Keyboard navigation and scroll handling
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!isOpen) return;

      const filteredPanels = getFilteredPanels();
      if (filteredPanels.length === 0) return;

      switch (event.key) {
        case "ArrowLeft":
          event.preventDefault();
          if (currentPanelIndex > 0) {
            goToPreviousPanel();
          }
          break;
        case "ArrowRight":
          event.preventDefault();
          if (currentPanelIndex < filteredPanels.length - 1) {
            goToNextPanel();
          }
          break;
        default:
          break;
      }
    };

    const handleWheel = (event) => {
      // If mouse is over sidepanel, prevent scroll from propagating to parent
      if (isMouseOverSidepanel) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("wheel", handleWheel);
    };
  }, [
    isOpen,
    currentPanelIndex,
    getFilteredPanels,
    goToPreviousPanel,
    goToNextPanel,
    isMouseOverSidepanel,
  ]);

  // Apply map rotation whenever bearing changes
  useEffect(() => {
    if (!isOpen) return;
    const map = mapRef.current;
    if (map && typeof map.setBearing === "function") {
      try {
        map.setBearing(bearing);
      } catch (e) {
        // no-op
      }
    }
  }, [bearing, isOpen]);

  // Toggle map dragging and cursor when rotate mode changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const container = map.getContainer();
    if (isRotateMode) {
      try {
        map.dragging.disable();
      } catch {}
      if (container) container.style.cursor = "grab";
    } else {
      try {
        map.dragging.enable();
      } catch {}
      if (container) container.style.cursor = "";
      isRotatingRef.current = false;
    }
  }, [isRotateMode]);

  // Handle mouse-driven rotation when rotate mode is enabled
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isRotateMode) return;

    const computeAngleFromPoint = (point) => {
      const size = map.getSize();
      const center = L.point(size.x / 2, size.y / 2);
      const angleRad = Math.atan2(point.y - center.y, point.x - center.x);
      return (angleRad * 180) / Math.PI; // degrees
    };

    const onMouseDown = (e) => {
      isRotatingRef.current = true;
      startAngleRef.current = computeAngleFromPoint(e.containerPoint);
      initialBearingRef.current = bearing;
      const container = map.getContainer();
      if (container) container.style.cursor = "grabbing";
    };

    const onMouseMove = (e) => {
      if (!isRotatingRef.current) return;
      const currentAngle = computeAngleFromPoint(e.containerPoint);
      let newBearing =
        initialBearingRef.current + (currentAngle - startAngleRef.current);
      newBearing = ((newBearing % 360) + 360) % 360; // normalize
      setBearing(newBearing);
      if (typeof map.setBearing === "function") {
        try {
          map.setBearing(newBearing);
        } catch {}
      }
    };

    const endRotate = () => {
      if (!isRotatingRef.current) return;
      isRotatingRef.current = false;
      const container = map.getContainer();
      if (container) container.style.cursor = "grab";
    };

    map.on("mousedown", onMouseDown);
    map.on("mousemove", onMouseMove);
    map.on("mouseup", endRotate);
    map.on("mouseout", endRotate);
    document.addEventListener("mouseup", endRotate);

    return () => {
      map.off("mousedown", onMouseDown);
      map.off("mousemove", onMouseMove);
      map.off("mouseup", endRotate);
      map.off("mouseout", endRotate);
      document.removeEventListener("mouseup", endRotate);
    };
  }, [isRotateMode, bearing]);

  // Basemap configurations
  const basemapConfigs = {
    satellite: {
      url: "https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
      attribution: "© Google",
      subdomains: ["mt1", "mt2", "mt3"],
      maxNativeZoom: 20, // Google's actual max zoom
    },
    streets: {
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: "© OpenStreetMap contributors",
      maxNativeZoom: 19, // OSM's actual max zoom
    },
    terrain: {
      url: "https://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}",
      attribution: "© Google",
      subdomains: ["mt1", "mt2", "mt3"],
      maxNativeZoom: 20, // Google's actual max zoom
    },
  };

  // Load tile data when component opens
  useEffect(() => {
    if (isOpen && taskId) {
      loadTileData();
    }
  }, [isOpen, taskId]);

  // Cleanup effect when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Clear tile data to stop fetching
      setTileJson(null);
      setError(null);
      setIsLoading(false);

      // Clear any existing map layers if map exists
      if (mapRef.current) {
        const map = mapRef.current;
        map.eachLayer((layer) => {
          if (layer instanceof L.TileLayer) {
            map.removeLayer(layer);
          }
        });
      }
    }
  }, [isOpen]);

  // Cleanup effect on component unmount
  useEffect(() => {
    return () => {
      // Clear tile data and stop all fetching
      setTileJson(null);
      setError(null);
      setIsLoading(false);

      // Clear map layers on unmount
      if (mapRef.current) {
        const map = mapRef.current;
        map.eachLayer((layer) => {
          if (layer instanceof L.TileLayer) {
            map.removeLayer(layer);
          }
        });
      }
    };
  }, []);

  const loadTileData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // First check if task has COG data
      const taskInfoResponse = await axiosInstance.getData(
        `/tiles/${taskId}/info`,
      );

      if (taskInfoResponse.error) {
        throw new Error(
          taskInfoResponse.error.message || "Failed to load task info",
        );
      }

      const taskInfo = taskInfoResponse.data || taskInfoResponse;

      if (!taskInfo.cogUrl) {
        throw new Error("COG data not available for this task");
      }

      // Load TileJSON metadata
      const tileJsonResponse = await axiosInstance.getData(
        `/tiles/${taskId}/tilejson`,
      );

      if (tileJsonResponse.error) {
        throw new Error(
          tileJsonResponse.error.message || "Failed to load tile metadata",
        );
      }

      const tileJsonData = tileJsonResponse.data || tileJsonResponse;
      setTileJson(tileJsonData);
    } catch (err) {
      setError(err.message || "Failed to load thermal COG data");
      toast.error(`Failed to load thermal tiles: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpacityChange = useCallback((newOpacity) => {
    setOpacity(newOpacity);
  }, []);

  const handleBasemapChange = useCallback((newBasemap) => {
    setBasemapType(newBasemap);
  }, []);

  const handlePanelOpacityChange = useCallback((newOpacity) => {
    setPanelOpacity(newOpacity);
  }, []);

  const resetView = useCallback(() => {
    if (mapRef.current && tileJson?.bounds?.length === 4) {
      const map = mapRef.current;
      const [west, south, east, north] = tileJson.bounds;
      const sw = L.latLng(south, west);
      const ne = L.latLng(north, east);
      map.fitBounds(L.latLngBounds(sw, ne), { padding: [20, 20] });
    }
  }, [tileJson]);

  // Compute initial center and zoom from geographic bounds
  let initialCenter = [0, 0];
  let initialZoom = tileJson ? tileJson.minzoom + 2 : 0;
  if (tileJson?.bounds?.length === 4) {
    const [west, south, east, north] = tileJson.bounds;
    initialCenter = [(south + north) / 2, (west + east) / 2];
    initialZoom = tileJson.minzoom + 2;
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 ml-24">
      <div className="relative w-full h-full max-w-full max-h-screen">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 bg-black bg-opacity-75 text-white p-4 z-30">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">Thermal COG Viewer</h2>
              <p className="text-sm text-gray-300">
                Task ID: {taskStatus?.id} | Images: {taskStatus?.imagesCount}
                {Array.isArray(panelData) &&
                  panelData.length > 0 &&
                  ` | Panels: ${panelData.length}`}
              </p>
            </div>
            <button
              onClick={() => {
                // Clear tile data before closing
                setTileJson(null);
                setError(null);
                setIsLoading(false);

                // Clear map layers
                if (mapRef.current) {
                  const map = mapRef.current;
                  map.eachLayer((layer) => {
                    if (layer instanceof L.TileLayer) {
                      map.removeLayer(layer);
                    }
                  });
                }

                onClose();
              }}
              className="text-white hover:text-gray-300 text-2xl p-2"
            >
              ×
            </button>
          </div>
        </div>

        {/* Controls Panel */}
        <div
          ref={sidepanelRef}
          className="absolute top-20 right-4 bg-gray-900 bg-opacity-95 text-white p-6 rounded-xl z-30 max-w-sm shadow-2xl border border-gray-700 backdrop-blur-sm overflow-y-auto max-h-[calc(100vh-120px)] thermal-scrollbar cog-viewer-sidepanel"
          onMouseEnter={() => setIsMouseOverSidepanel(true)}
          onMouseLeave={() => setIsMouseOverSidepanel(false)}
          onWheel={(e) => {
            // Prevent scroll from propagating to parent container
            e.stopPropagation();
          }}
          onScroll={(e) => {
            // Prevent scroll from propagating to parent container
            e.stopPropagation();
          }}
        >
          <div className="space-y-6">
            {/* Opacity Control */}
            <div>
              <label className="block text-sm font-semibold mb-3 text-gray-200">
                Thermal Opacity: {Math.round(opacity * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={opacity}
                onChange={(e) =>
                  handleOpacityChange(parseFloat(e.target.value))
                }
                className="w-full h-3 bg-gray-700 rounded-full appearance-none cursor-pointer slider-thumb"
              />
            </div>

            {/* Rotation Lock (mouse-driven) */}
            <div>
              <label className="block text-sm font-semibold mb-3 text-gray-200">
                Map Rotation
              </label>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsRotateMode((v) => !v)}
                  className={`px-3 py-2 rounded-lg text-sm border ${
                    isRotateMode
                      ? "bg-gray-800 border-gray-600 hover:bg-gray-700"
                      : "bg-blue-600 border-blue-500 hover:bg-blue-500"
                  }`}
                >
                  {isRotateMode ? "Rotate (lock)" : "Unlock Rotation"}
                </button>
                <button
                  onClick={() => {
                    setBearing(0);
                    if (
                      mapRef.current &&
                      typeof mapRef.current.setBearing === "function"
                    ) {
                      mapRef.current.setBearing(0);
                    }
                  }}
                  className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm border border-gray-600"
                >
                  Reset
                </button>
              </div>
              <div className="text-xs text-gray-400 mt-2">
                {isRotateMode
                  ? "Drag on the map to rotate. Panning is disabled while locked."
                  : `Current bearing: ${Math.round(bearing)}°`}
              </div>
            </div>

            {/* Panel Controls */}
            {Array.isArray(panelData) && panelData.length > 0 && (
              <div>
                <label className="block text-sm font-semibold mb-3 text-gray-200">
                  Panel Overlay
                </label>
                <div className="space-y-3">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showPanels}
                      onChange={(e) => setShowPanels(e.target.checked)}
                      className="mr-3 w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <span className="text-sm text-gray-200">Show Panels</span>
                  </label>
                  {showPanels && (
                    <div className="pl-7">
                      <label className="block text-xs text-gray-400 mb-2">
                        Panel Opacity: {Math.round(panelOpacity * 100)}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={panelOpacity}
                        onChange={(e) =>
                          handlePanelOpacityChange(parseFloat(e.target.value))
                        }
                        className="w-full h-3 bg-gray-700 rounded-full appearance-none cursor-pointer slider-thumb"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Source Model Dropdown */}
            {Array.isArray(panelData) && panelData.length > 0 && (
              <div>
                <label className="block text-sm font-semibold mb-3 text-gray-200">
                  Source Model
                </label>
                <select
                  value={selectedSourceModel}
                  onChange={(e) => {
                    setSelectedSourceModel(e.target.value);
                    setCurrentPanelIndex(0);
                  }}
                  className="w-full p-3 bg-gray-800 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-200"
                >
                  <option value="all">All Models</option>
                  <option value="LOW">LOW</option>
                  <option value="HIGH">HIGH</option>
                </select>
              </div>
            )}

            {/* Panel Navigation */}
            {(() => {
              const filteredPanels = Array.isArray(panelData)
                ? getFilteredPanels()
                : [];
              return filteredPanels.length > 0 ? (
                <div className="border-t border-gray-600 pt-6">
                  <label className="block text-sm font-semibold mb-3 text-gray-200">
                    Panel Navigation
                  </label>

                  {/* Panel Counter */}
                  <div className="text-sm text-gray-300 mb-4 bg-gray-800 rounded-lg p-3 text-center">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-blue-400">
                        Panel {currentPanelIndex + 1}
                      </span>
                      <span className="text-gray-400"> of </span>
                      <span className="font-semibold text-blue-400">
                        {filteredPanels.length}
                      </span>
                    </div>
                  </div>

                  {/* Navigation Buttons */}
                  <div className="flex space-x-3 mb-4">
                    <button
                      onClick={goToPreviousPanel}
                      disabled={currentPanelIndex === 0}
                      className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 disabled:text-gray-500 rounded-lg text-sm font-medium transition-all duration-200 border border-gray-600 hover:border-gray-500 disabled:border-gray-700"
                    >
                      ← Previous
                    </button>
                    <button
                      onClick={goToNextPanel}
                      disabled={currentPanelIndex === filteredPanels.length - 1}
                      className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 disabled:text-gray-500 rounded-lg text-sm font-medium transition-all duration-200 border border-gray-600 hover:border-gray-500 disabled:border-gray-700"
                    >
                      Next →
                    </button>
                  </div>

                  {/* Current Panel Details */}
                  {filteredPanels[currentPanelIndex] && (
                    <div className="text-sm text-gray-300 space-y-2 p-4 bg-gray-800 rounded-lg border border-gray-700">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Defect:</span>
                        <span className="font-semibold text-blue-400">
                          {filteredPanels[currentPanelIndex].index}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Class:</span>
                        <span
                          className={`font-semibold ${
                            filteredPanels[currentPanelIndex].class ===
                            "Unhealthy"
                              ? "text-red-400"
                              : filteredPanels[currentPanelIndex].class ===
                                "Damaged"
                              ? "text-orange-400"
                              : filteredPanels[currentPanelIndex].class ===
                                "Hotspot"
                              ? "text-pink-400"
                              : "text-green-400"
                          }`}
                        >
                          {filteredPanels[currentPanelIndex].class}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Confidence:</span>
                        <span className="font-semibold text-yellow-400">
                          {(
                            filteredPanels[currentPanelIndex].confidence * 100
                          ).toFixed(1)}
                          %
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Model:</span>
                        <span
                          className={`font-semibold ${
                            filteredPanels[currentPanelIndex].source_model ===
                            "LOW"
                              ? "text-red-400"
                              : "text-orange-400"
                          }`}
                        >
                          {filteredPanels[currentPanelIndex].source_model}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-600">
                        Use ← → arrow keys to navigate panels
                      </div>
                    </div>
                  )}
                </div>
              ) : selectedSourceModel !== "all" ? (
                <div className="border-t border-gray-600 pt-6">
                  <div className="text-sm text-gray-400 text-center py-4 bg-gray-800 rounded-lg border border-gray-700">
                    No panels found for {selectedSourceModel} model
                  </div>
                </div>
              ) : null;
            })()}
            {/* Panel Data Banners */}
            {!isLoading && !error && (
              <div className="pt-6">
                {panelData === null && (
                  <div className="text-sm text-yellow-300 text-center py-3 bg-yellow-900 bg-opacity-30 rounded-lg border border-yellow-700">
                    AI is still processing panel data...
                  </div>
                )}
                {Array.isArray(panelData) && panelData.length === 0 && (
                  <div className="text-sm text-green-300 text-center py-3 bg-green-900 bg-opacity-30 rounded-lg border border-green-700">
                    There are no unhealthy panels.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Map Container */}
        <div className="w-full h-full pt-16">
          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center h-full text-white">
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto mb-4"></div>
                <h3 className="text-xl font-semibold mb-2">
                  Loading Thermal Tiles
                </h3>
                <p className="text-gray-300">Preparing COG tile data...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="flex items-center justify-center h-full text-white">
              <div className="text-center">
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
                  Failed to Load Tiles
                </h3>
                <p className="text-gray-300 mb-4">{error}</p>
                <button
                  onClick={loadTileData}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* Success State - Map */}
          {!isLoading && !error && tileJson && (
            <MapContainer
              ref={mapRef}
              center={initialCenter}
              zoom={initialZoom}
              className="w-full h-full cog-viewer-map"
              style={{
                background: "#000",
                cursor: isRotateMode ? "grab" : undefined,
              }}
              rotate={true}
              bearing={bearing}
              whenCreated={(map) => {
                mapRef.current = map;
                map.options.rotate = true;
                if (typeof map.setBearing === "function") {
                  map.setBearing(bearing);
                }
              }}
            >
              {/* Basemap Layer */}
              {showBasemap && (
                <TileLayer
                  url={basemapConfigs[basemapType].url}
                  attribution={basemapConfigs[basemapType].attribution}
                  subdomains={basemapConfigs[basemapType].subdomains}
                  maxNativeZoom={basemapConfigs[basemapType].maxNativeZoom}
                  maxZoom={50}
                />
              )}

              {/* COG Tile Layer */}
              {tileJson.tiles && tileJson.tiles[0] && (
                <AuthenticatedTileLayer
                  tileUrl={(() => {
                    const baseUrl = process.env.REACT_APP_BASEURL || "";
                    const tilePath = tileJson.tiles[0];

                    // Remove leading slash from tile path if base URL ends with slash
                    const cleanTilePath =
                      baseUrl.endsWith("/") && tilePath.startsWith("/")
                        ? tilePath.substring(1)
                        : tilePath;

                    const finalUrl = baseUrl + cleanTilePath;
                    return finalUrl;
                  })()}
                  opacity={opacity}
                  attribution="Thermal COG Data"
                  isActive={isOpen}
                />
              )}

              {/* Solar Panel Polygons */}
              {showPanels &&
                Array.isArray(panelData) &&
                (() => {
                  const filteredPanels = getFilteredPanels();
                  return filteredPanels.length > 0 ? (
                    <SolarPanelPolygons
                      panels={filteredPanels}
                      opacity={panelOpacity}
                      taskId={taskId}
                      currentPanelIndex={currentPanelIndex}
                    />
                  ) : null;
                })()}

              {/* Fit bounds to COG data */}
              <FitBounds bounds={tileJson.bounds} />
            </MapContainer>
          )}
        </div>
      </div>
    </div>
  );
};

export default CogTileViewer;
