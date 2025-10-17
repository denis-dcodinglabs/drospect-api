import { useCallback, useEffect, useState, useRef } from "react";
import axiosInstance from "../axiosInstance";
import { toast } from "react-toastify";
import mapboxgl from "mapbox-gl";
import GreenPointer from "../assets/Green-pointer.png";

const HealthyImagesLayer = ({
  map,
  projectId,
  showHeatMap,
  refresh,
  handleImageClick,
  onHealthyCountChange,
}) => {
  const [healthyItems, setHealthyItems] = useState([]);
  const [showHealthyImages, setShowHealthyImages] = useState(false);
  const healthyMarkersRef = useRef([]);

  const fetchHealthyData = useCallback(async () => {
    try {
      const res = await axiosInstance.getData(
        `/projects/images/${projectId}?page=1&limit=9999&isHealthy=true&isInspected=true`,
      );
      setHealthyItems(res?.data?.images);
      // Notify parent component of the count change
      if (onHealthyCountChange) {
        onHealthyCountChange(res?.data?.images?.length || 0);
      }
    } catch (err) {
      toast.error(`Error fetching healthy images: ${err.message}`);
    }
  }, [projectId, onHealthyCountChange]);

  // Fetch healthy data when showHealthyImages is enabled
  useEffect(() => {
    if (showHealthyImages) {
      fetchHealthyData();
    } else {
      setHealthyItems([]);
      if (onHealthyCountChange) {
        onHealthyCountChange(0);
      }
    }
  }, [fetchHealthyData, showHealthyImages, refresh]);

  // Create and manage healthy markers
  useEffect(() => {
    if (!map) return;

    // Clear existing healthy markers
    healthyMarkersRef.current.forEach((marker) => marker.remove());
    healthyMarkersRef.current = [];

    // Add healthy (green) markers when enabled and heatmap is off
    if (!showHeatMap && showHealthyImages && healthyItems.length > 0) {
      healthyItems
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
            console.warn(`Invalid coordinates for healthy item ${item.id}:`, {
              lat,
              lng,
            });
            return;
          }

          // Create green marker element for healthy images
          const markerElement = document.createElement("div");
          markerElement.className = "custom-marker healthy-marker";
          markerElement.style.cssText = `
            width: 35px;
            height: 35px;
            background-image: url('${GreenPointer}');
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            cursor: pointer;
            position: relative;
            z-index: 1;
          `;
          markerElement.title =
            "Healthy panel - Double-click to see popup image";

          // Add hover effect
          markerElement.addEventListener("mouseenter", () => {
            markerElement.style.opacity = "0.8";
            markerElement.style.filter = "brightness(1.1)";
          });
          markerElement.addEventListener("mouseleave", () => {
            markerElement.style.opacity = "1";
            markerElement.style.filter = "brightness(1)";
          });

          // Add click handlers
          let clickTimeout;
          markerElement.addEventListener("click", (e) => {
            e.stopPropagation();
            e.preventDefault();

            if (clickTimeout) {
              clearTimeout(clickTimeout);
            }

            clickTimeout = setTimeout(() => {
              handleImageClick(item);
            }, 200);
          });

          markerElement.addEventListener("dblclick", (e) => {
            e.stopPropagation();
            e.preventDefault();

            if (clickTimeout) {
              clearTimeout(clickTimeout);
            }

            handleImageClick(item);
          });

          // Create marker
          const marker = new mapboxgl.Marker({
            element: markerElement,
            anchor: "bottom",
            offset: [0, 0],
          })
            .setLngLat([lng, lat])
            .addTo(map);

          // Store marker with reference to its data
          marker._itemData = item;
          marker._itemIndex = index;
          healthyMarkersRef.current.push(marker);
        });
    }
  }, [map, showHeatMap, showHealthyImages, healthyItems, handleImageClick]);

  // Update marker positions when coordinates change
  useEffect(() => {
    if (!map || showHeatMap || !healthyMarkersRef.current.length) return;

    healthyMarkersRef.current.forEach((marker) => {
      const itemData = marker._itemData;
      if (itemData) {
        const lng = parseFloat(itemData.longitude);
        const lat = parseFloat(itemData.latitude);

        if (!isNaN(lng) && !isNaN(lat)) {
          marker.setLngLat([lng, lat]);
        }
      }
    });
  }, [map, healthyItems, showHeatMap]);

  // Cleanup markers when component unmounts
  useEffect(() => {
    return () => {
      if (healthyMarkersRef.current) {
        healthyMarkersRef.current.forEach((marker) => marker.remove());
        healthyMarkersRef.current = [];
      }
    };
  }, []);

  return (
    <>
      {/* Healthy Images Toggle Button */}
      <div className="absolute top-3 right-12 z-10">
        <button
          onClick={() => setShowHealthyImages(!showHealthyImages)}
          className="px-3 py-2 rounded-lg font-medium transition-all duration-200 text-sm shadow-lg backdrop-blur-sm bg-gray-800/90 hover:bg-gray-700/90 text-gray-300 border border-gray-600"
          title={
            showHealthyImages ? "Show only unhealthy panels" : "Show all panels"
          }
        >
          {showHealthyImages ? "Show unhealthy" : "Show all images"}
        </button>
      </div>
    </>
  );
};

export default HealthyImagesLayer;
