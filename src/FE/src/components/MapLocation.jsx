import { useCallback, useEffect, useState, useMemo, useRef } from "react";
import axiosInstance from "../axiosInstance";
import { toast } from "react-toastify";
import mapboxgl from "mapbox-gl";
import HeatMapControls from "./HeatMapControls";
import HealthyImagesLayer from "./HealthyImagesLayer";
import {
  processHeatmapData,
  getTemperatureStats,
  HEAT_PALETTES,
  getHeatmapConfig,
} from "../utils/temperatureUtils";

// Set your Mapbox access token here or in env variables
mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;
const MapLocation = ({
  id,
  longitude = 0,
  latitude = 0,
  handleImageClick,
  imageRefs,
  setImageSelect,
  refresh = false,
  filteredImages = null,
  showDuplicatesFiltered = false,
}) => {
  const [items, setItems] = useState([]);
  const [healthyItemsCount, setHealthyItemsCount] = useState(0);
  const [showHeatMap, setShowHeatMap] = useState(false);
  const [heatMapMode, setHeatMapMode] = useState("delta");
  const [selectedPalette, setSelectedPalette] = useState("thermal");
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markersRef = useRef([]);

  const scrollToImage = (item, index) => {
    setImageSelect(item.id);
    if (imageRefs.current[index]) {
      imageRefs.current[index].scrollIntoView({ behavior: "smooth" });
    }
  };

  const fetchData = useCallback(async () => {
    try {
      const res = await axiosInstance.getData(
        `/projects/images/${id}?page=1&limit=9999&isHealthy=false&isInspected=true`,
      );
      setItems(res?.data?.images);
    } catch (err) {
      toast.error(`Error fetching project: ${err.message}`);
    }
  }, [id]);

  useEffect(() => {
    if (showDuplicatesFiltered && filteredImages) {
      const unhealthyFilteredImages = filteredImages.filter(
        (img) => img.isInspected && !img.isHealthy,
      );
      setItems(unhealthyFilteredImages);
    } else {
      fetchData();
    }
  }, [fetchData, refresh, filteredImages, showDuplicatesFiltered]);

  // Initialize map
  useEffect(() => {
    if (map.current) return; // Initialize map only once

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          "google-satellite": {
            type: "raster",
            tiles: [
              "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
              "https://mt2.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
              "https://mt3.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
            ],
            tileSize: 256,
            attribution: "© Google Maps",
          },
        },
        layers: [
          {
            id: "google-satellite-layer",
            type: "raster",
            source: "google-satellite",
            minzoom: 0,
            maxzoom: 22,
          },
        ],
      },
      center: [longitude, latitude],
      zoom: 17,
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Force safe defaults in case previous selections became invalid
  useEffect(() => {
    // Always use delta mode per current UI
    if (heatMapMode !== "delta") {
      setHeatMapMode("delta");
    }
    // Coerce palette to a supported option
    if (selectedPalette !== "thermal" && selectedPalette !== "plasma") {
      setSelectedPalette("thermal");
    }
  }, [heatMapMode, selectedPalette]);

  // Update map center when coordinates change
  useEffect(() => {
    if (map.current && longitude && latitude) {
      map.current.setCenter([longitude, latitude]);
    }
  }, [longitude, latitude]);

  // Process heatmap data using new utility
  const heatMapData = useMemo(() => {
    if (!showHeatMap || !items.length) return null;

    console.log(
      `Processing heatmap data - Mode: ${heatMapMode}, Items: ${items.length}`,
    );

    const processedData = processHeatmapData(items, heatMapMode);
    console.log(
      `Heatmap processed - Features: ${processedData?.features?.length || 0}`,
    );

    // Fallback: create simple heatmap data if main processing fails
    if (!processedData?.features?.length && items.length > 0) {
      console.log("Using fallback heatmap data generation");

      const fallbackFeatures = [];
      items.forEach((item, index) => {
        if (item.latitude && item.longitude) {
          const lat = parseFloat(item.latitude);
          const lng = parseFloat(item.longitude);

          if (!isNaN(lat) && !isNaN(lng)) {
            fallbackFeatures.push({
              type: "Feature",
              properties: {
                intensity: 5, // Fixed intensity for testing
                weight: 1,
                temperature: 75,
                itemId: item.id,
              },
              geometry: {
                type: "Point",
                coordinates: [lng, lat],
              },
            });
          }
        }
      });

      console.log("Generated fallback features:", fallbackFeatures.length);

      return {
        type: "FeatureCollection",
        features: fallbackFeatures,
      };
    }

    return processedData;
  }, [items, showHeatMap, heatMapMode]);

  // Get temperature statistics
  const temperatureStats = useMemo(() => {
    if (!items.length) return null;
    return getTemperatureStats(items);
  }, [items]);

  // Enhanced heatmap layer management
  useEffect(() => {
    if (!map.current) return;

    const mapInstance = map.current;

    // Clean up existing heatmap layers
    const cleanupHeatmap = () => {
      try {
        if (mapInstance.getLayer("heatmap-layer")) {
          mapInstance.removeLayer("heatmap-layer");
        }
        if (mapInstance.getSource("heatmap-data")) {
          mapInstance.removeSource("heatmap-data");
        }
      } catch (error) {
        console.warn("Error cleaning up heatmap:", error);
      }
    };

    cleanupHeatmap();

    // Add new heatmap if enabled and data exists
    if (showHeatMap && heatMapData && heatMapData.features.length > 0) {
      try {
        console.log("Creating heatmap with data:", heatMapData);

        // Add the data source
        mapInstance.addSource("heatmap-data", {
          type: "geojson",
          data: heatMapData,
        });

        // Simplified heatmap configuration that should definitely work
        mapInstance.addLayer({
          id: "heatmap-layer",
          type: "heatmap",
          source: "heatmap-data",
          paint: {
            // Simple weight based on intensity
            "heatmap-weight": [
              "case",
              ["has", "intensity"],
              ["get", "intensity"],
              1,
            ],

            // Reduced intensity for better visibility
            "heatmap-intensity": [
              "interpolate",
              ["linear"],
              ["zoom"],
              10,
              0.4,
              15,
              0.8,
            ],

            // Dynamic color scheme based on selected palette
            "heatmap-color": (() => {
              const palette =
                HEAT_PALETTES[selectedPalette] || HEAT_PALETTES.thermal;

              // Convert gradient to array and sort by stop value to ensure ascending order
              const gradientEntries = Object.entries(palette.gradient)
                .map(([stop, color]) => [parseFloat(stop), color])
                .sort((a, b) => a[0] - b[0]); // Sort by stop value ascending

              const gradientStops = gradientEntries.flatMap(([stop, color]) => [
                stop,
                color,
              ]);

              return [
                "interpolate",
                ["linear"],
                ["heatmap-density"],
                ...gradientStops,
              ];
            })(),

            // Reduced radius for less overwhelming effect
            "heatmap-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              10,
              15,
              15,
              30,
            ],

            // Lower opacity for subtler effect
            "heatmap-opacity": 0.7,
          },
        });

        console.log(
          `Heatmap layer created successfully with ${heatMapData.features.length} data points`,
        );
      } catch (error) {
        console.error("Error creating heatmap:", error);
        toast.error("Failed to display heatmap. Please try again.");
      }
    }

    // Cleanup function
    return () => {
      cleanupHeatmap();
    };
  }, [showHeatMap, heatMapData, selectedPalette]);

  // Update markers (only show when heatmap is off)
  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Add unhealthy (red) markers only when heatmap is not active
    if (!showHeatMap && items.length > 0) {
      items
        .filter((item) => item?.latitude !== null && item?.longitude !== null)
        .forEach((item, index) => {
          // Validate coordinates
          const lng = parseFloat(item.longitude);
          const lat = parseFloat(item.latitude);

          if (
            isNaN(lng) ||
            isNaN(lat) ||
            lng < -180 ||
            lng > 180 ||
            lat < -90 ||
            lat > 90
          ) {
            console.warn(`Invalid coordinates for item ${item.id}:`, {
              lat,
              lng,
            });
            return;
          }

          // Create red marker element for unhealthy images
          const markerElement = document.createElement("div");
          markerElement.className = "custom-marker unhealthy-marker";
          markerElement.style.cssText = `
            width: 35px;
            height: 35px;
            background-image: url('https://static.vecteezy.com/system/resources/previews/023/554/762/original/red-map-pointer-icon-on-a-transparent-background-free-png.png');
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            cursor: pointer;
            position: relative;
            z-index: 2;
          `;
          markerElement.title =
            "Unhealthy panel - Double-click to see popup image";

          // Add hover effect with opacity instead of transform
          markerElement.addEventListener("mouseenter", () => {
            markerElement.style.opacity = "0.8";
            markerElement.style.filter = "brightness(1.1)";
          });
          markerElement.addEventListener("mouseleave", () => {
            markerElement.style.opacity = "1";
            markerElement.style.filter = "brightness(1)";
          });

          // Add click handlers with proper event handling
          let clickTimeout;
          markerElement.addEventListener("click", (e) => {
            e.stopPropagation();
            e.preventDefault();

            // Clear any existing timeout
            if (clickTimeout) {
              clearTimeout(clickTimeout);
            }

            // Set a timeout to handle single click
            clickTimeout = setTimeout(() => {
              scrollToImage(item, index);
            }, 200); // 200ms delay to allow for double-click detection
          });

          markerElement.addEventListener("dblclick", (e) => {
            e.stopPropagation();
            e.preventDefault();

            // Clear single click timeout
            if (clickTimeout) {
              clearTimeout(clickTimeout);
            }

            handleImageClick(item);
          });

          // Create marker with proper options
          const marker = new mapboxgl.Marker({
            element: markerElement,
            anchor: "bottom", // Anchor point at bottom of marker
            offset: [0, 0], // No additional offset
          })
            .setLngLat([lng, lat])
            .addTo(map.current);

          // Store marker with reference to its data
          marker._itemData = item;
          marker._itemIndex = index;
          markersRef.current.push(marker);
        });
    }
  }, [items, showHeatMap, handleImageClick]);

  // Separate effect to handle coordinate updates without recreating markers
  useEffect(() => {
    if (!map.current || showHeatMap) return;

    // Update existing unhealthy marker positions if coordinates changed
    if (markersRef.current.length) {
      markersRef.current.forEach((marker) => {
        const itemData = marker._itemData;
        if (itemData) {
          const lng = parseFloat(itemData.longitude);
          const lat = parseFloat(itemData.latitude);

          if (!isNaN(lng) && !isNaN(lat)) {
            marker.setLngLat([lng, lat]);
          }
        }
      });
    }
  }, [items, showHeatMap]);

  // Clean up markers when component unmounts
  useEffect(() => {
    return () => {
      if (markersRef.current) {
        markersRef.current.forEach((marker) => marker.remove());
        markersRef.current = [];
      }
    };
  }, []);

  return (
    <div className="w-full space-y-3">
      {/* Heat Map Controls */}
      <HeatMapControls
        showHeatMap={showHeatMap}
        onToggleHeatMap={setShowHeatMap}
        heatMapMode={heatMapMode}
        onModeChange={setHeatMapMode}
        selectedPalette={selectedPalette}
        onPaletteChange={setSelectedPalette}
        temperatureStats={temperatureStats}
      />

      {/* Map Container */}
      <div className="relative">
        <div className="w-full h-[600px] rounded-lg overflow-hidden border-2 border-gray-700 shadow-xl">
          <div ref={mapContainer} className="w-full h-full" />
        </div>

        {/* Healthy Images Layer Component */}
        <HealthyImagesLayer
          map={map.current}
          projectId={id}
          showHeatMap={showHeatMap}
          refresh={refresh}
          handleImageClick={handleImageClick}
          onHealthyCountChange={setHealthyItemsCount}
        />

        {/* Enhanced heat map status indicator */}
        {showHeatMap && heatMapData?.features?.length > 0 && (
          <div className="absolute top-3 left-3 bg-black/80 rounded-lg p-2 backdrop-blur-sm text-white text-xs max-w-48">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="font-medium text-xs">
                🔥 {heatMapMode === "delta" ? "Temp Delta" : "Peak Temp"} Active
              </span>
            </div>
            <div className="text-xs text-gray-300">
              {heatMapData.features.length} heat points •{" "}
              {HEAT_PALETTES[selectedPalette]?.name}
            </div>
          </div>
        )}
      </div>

      {/* Enhanced instruction text */}
      <div className="text-center text-gray-400 text-sm">
        {showHeatMap ? (
          <div className="flex items-center justify-center gap-2">
            <span>🔥 Heat zones show temperature anomalies</span>
            <span className="text-gray-500">•</span>
            <span>{items.length} unhealthy panels</span>
            {healthyItemsCount > 0 && (
              <>
                <span className="text-gray-500">•</span>
                <span>{healthyItemsCount} healthy panels</span>
              </>
            )}
            {heatMapData && (
              <>
                <span className="text-gray-500">•</span>
                <span>{heatMapData.features.length} heat points</span>
              </>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <span>📍 Double-click markers for panel details</span>
            <span className="text-gray-500">•</span>
            <span className="text-red-400">
              {items.length} unhealthy panels
            </span>
            {healthyItemsCount > 0 && (
              <>
                <span className="text-gray-500">•</span>
                <span className="text-green-400">
                  {healthyItemsCount} healthy panels
                </span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MapLocation;
