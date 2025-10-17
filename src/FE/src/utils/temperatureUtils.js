/**
 * Enhanced temperature utilities for Mapbox GL JS heatmaps
 * Optimized for solar panel temperature visualization
 */

/**
 * Process solar panel data into Mapbox-compatible heatmap format
 * @param {Array} images - Array of image objects with panelInformation
 * @param {string} mode - 'temperature' or 'delta'
 * @returns {Object} GeoJSON FeatureCollection for Mapbox
 */
export const processHeatmapData = (images, mode = "delta") => {
  console.log(
    `🔥 Processing heatmap: ${mode} mode, ${images?.length || 0} images`,
  );

  if (!images || !images.length) {
    return {
      type: "FeatureCollection",
      features: [],
    };
  }

  const features = [];
  let values = [];

  // Helper to extract values for a given mode
  const collectValues = (targetMode) => {
    const collected = [];
    images.forEach((image) => {
      if (image.latitude && image.longitude && image.panelInformation) {
        if (image.panelInformation && Array.isArray(image.panelInformation)) {
          image.panelInformation.forEach((panel) => {
            const value =
              targetMode === "temperature"
                ? parseFloat(panel.HighestTemp || panel.AvgTemp || 0)
                : parseFloat(panel.Delta || 0);
            if (value > 0) collected.push(value);
          });
        }
      }
    });
    return collected;
  };

  // Extract all values first for proper normalization
  images.forEach((image, imageIndex) => {
    if (image.latitude && image.longitude && image.panelInformation) {
      const lat = parseFloat(image.latitude);
      const lng = parseFloat(image.longitude);

      // Validate coordinates
      if (
        isNaN(lat) ||
        isNaN(lng) ||
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180
      ) {
        return;
      }

      if (image.panelInformation && Array.isArray(image.panelInformation)) {
        image.panelInformation.forEach((panel, panelIndex) => {
          const value =
            mode === "temperature"
              ? parseFloat(panel.HighestTemp || panel.AvgTemp || 0)
              : parseFloat(panel.Delta || 0);
          if (value > 0) values.push(value);
        });
      }
    }
  });

  // If no values for delta, gracefully fall back to temperature values
  if (values.length === 0 && mode === "delta") {
    values = collectValues("temperature");
    if (values.length === 0) {
      console.log("⚠️ No valid heatmap values found");
      return {
        type: "FeatureCollection",
        features: [],
      };
    }
  } else if (values.length === 0) {
    console.log("⚠️ No valid heatmap values found");
    return {
      type: "FeatureCollection",
      features: [],
    };
  }

  // Calculate statistics for normalization
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue;

  console.log(
    `📊 ${mode} range: ${minValue.toFixed(1)}°C - ${maxValue.toFixed(1)}°C`,
  );

  // Create features with normalized weights
  images.forEach((image, imageIndex) => {
    if (image.latitude && image.longitude && image.panelInformation) {
      const lat = parseFloat(image.latitude);
      const lng = parseFloat(image.longitude);

      if (
        isNaN(lat) ||
        isNaN(lng) ||
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180
      ) {
        return;
      }

      if (Array.isArray(image.panelInformation)) {
        image.panelInformation.forEach((panel, panelIndex) => {
          let value =
            mode === "temperature"
              ? parseFloat(panel.HighestTemp || panel.AvgTemp || 0)
              : parseFloat(panel.Delta || 0);

          // If delta has no signal, fallback to temperature per above
          if (value <= 0 && mode === "delta") {
            value = parseFloat(panel.HighestTemp || panel.AvgTemp || 0);
          }

          if (value > 0) {
            // Normalize to 0-1 range, then scale for better visibility
            const normalizedValue =
              range > 0 ? (value - minValue) / range : 0.5;
            const weight = Math.max(0.1, Math.min(1.0, normalizedValue));

            // Create a feature for each panel
            features.push({
              type: "Feature",
              properties: {
                weight: weight,
                intensity: weight * 10, // Scale for better heatmap visibility
                temperature:
                  mode === "temperature"
                    ? value
                    : panel.HighestTemp || panel.AvgTemp || 0,
                delta: mode === "delta" ? value : panel.Delta || 0,
                panelId: `${image.id}-${panelIndex}`,
                imageId: image.id,
              },
              geometry: {
                type: "Point",
                coordinates: [lng, lat], // Mapbox uses [lng, lat] order
              },
            });
          }
        });
      }
    }
  });

  console.log(`✅ Generated ${features.length} heatmap features`);

  return {
    type: "FeatureCollection",
    features: features,
  };
};

/**
 * Get comprehensive temperature statistics
 */
export const getTemperatureStats = (images) => {
  if (!images || !images.length) {
    return {
      maxTemp: 0,
      minTemp: 0,
      avgTemp: 0,
      maxDelta: 0,
      avgDelta: 0,
      totalPanels: 0,
      hotspots: 0,
    };
  }

  let maxTemp = 0;
  let minTemp = Infinity;
  let maxDelta = 0;
  let totalTemp = 0;
  let totalDelta = 0;
  let totalPanels = 0;
  let hotspots = 0;

  images.forEach((image) => {
    if (image.panelInformation) {
      image.panelInformation.forEach((panel) => {
        const temp = parseFloat(panel.HighestTemp || panel.AvgTemp || 0);
        const delta = parseFloat(panel.Delta || 0);

        if (temp > 0) {
          totalPanels++;
          totalTemp += temp;
          maxTemp = Math.max(maxTemp, temp);
          minTemp = Math.min(minTemp, temp);

          // Count hotspots (panels significantly above average)
          if (temp > 80) hotspots++; // Configurable threshold
        }

        if (delta > 0) {
          totalDelta += delta;
          maxDelta = Math.max(maxDelta, delta);
        }
      });
    }
  });

  return {
    maxTemp,
    minTemp: minTemp === Infinity ? 0 : minTemp,
    avgTemp: totalPanels > 0 ? totalTemp / totalPanels : 0,
    maxDelta,
    avgDelta: totalPanels > 0 ? totalDelta / totalPanels : 0,
    totalPanels,
    hotspots,
    tempRange: maxTemp - (minTemp === Infinity ? 0 : minTemp),
  };
};

/**
 * Enhanced heat map color palettes optimized for solar panel visualization
 */
export const HEAT_PALETTES = {
  thermal: {
    name: "Thermal",
    gradient: {
      0.0: "rgba(0, 0, 255, 0)", // Transparent blue
      0.2: "rgba(0, 100, 255, 0.6)", // Blue
      0.4: "rgba(0, 255, 255, 0.7)", // Cyan
      0.6: "rgba(0, 255, 0, 0.8)", // Green
      0.7: "rgba(255, 255, 0, 0.9)", // Yellow
      0.8: "rgba(255, 165, 0, 0.95)", // Orange
      1.0: "rgba(255, 0, 0, 1.0)", // Red
    },
  },
};

/**
 * Get optimal heatmap configuration for Mapbox GL JS
 */
export const getHeatmapConfig = (selectedPalette = "thermal", dataSize = 0) => {
  const palette = HEAT_PALETTES[selectedPalette] || HEAT_PALETTES.thermal;

  // Convert gradient to Mapbox format
  const gradientStops = Object.entries(palette.gradient).flatMap(
    ([stop, color]) => [parseFloat(stop), color],
  );

  // Adjust settings based on data density
  const isHighDensity = dataSize > 100;
  const isMediumDensity = dataSize > 50;

  return {
    paint: {
      // Weight based on our intensity property
      "heatmap-weight": [
        "interpolate",
        ["linear"],
        ["get", "intensity"],
        0,
        0,
        10,
        1,
      ],

      // Intensity increases with zoom for better visibility
      "heatmap-intensity": [
        "interpolate",
        ["linear"],
        ["zoom"],
        10,
        isHighDensity ? 0.8 : 1.0,
        15,
        isHighDensity ? 1.5 : 2.0,
        20,
        isHighDensity ? 2.0 : 3.0,
      ],

      // Color ramp
      "heatmap-color": [
        "interpolate",
        ["linear"],
        ["heatmap-density"],
        ...gradientStops,
      ],

      // Dynamic radius based on zoom and data density
      "heatmap-radius": [
        "interpolate",
        ["linear"],
        ["zoom"],
        8,
        isHighDensity ? 5 : 8,
        12,
        isHighDensity ? 10 : 15,
        16,
        isHighDensity ? 20 : 30,
        20,
        isHighDensity ? 35 : 50,
      ],

      // Opacity that increases with zoom
      "heatmap-opacity": [
        "interpolate",
        ["linear"],
        ["zoom"],
        8,
        0.6,
        12,
        0.8,
        16,
        0.9,
        20,
        1.0,
      ],
    },
  };
};
