/**
 * Spatial Sorting Utilities for Solar Panel Navigation
 *
 * This module provides functions to sort solar panels by their geographic position
 * in a logical left-to-right, top-to-bottom order for natural navigation.
 */

/**
 * Sorts panels spatially (left-to-right, top-to-bottom) based on their GPS coordinates
 * @param {Array} panels - Array of panel objects with wgs84_points property
 * @returns {Array} - Spatially sorted panels
 */
export const sortPanelsSpatially = (panels) => {
  if (!panels || panels.length === 0) return panels;

  // Filter out panels without valid coordinates
  const validPanels = panels.filter((panel) => {
    const wgs84Points = panel.wgs84_points || [];
    return (
      wgs84Points.length >= 4 &&
      wgs84Points.every(
        (point) =>
          point &&
          typeof point.lat === "number" &&
          typeof point.lon === "number",
      )
    );
  });

  if (validPanels.length === 0) return panels;

  // Calculate the center point of each panel
  const panelsWithCenter = validPanels.map((panel) => {
    const wgs84Points = panel.wgs84_points;
    const lats = wgs84Points.map((p) => p.lat);
    const lngs = wgs84Points.map((p) => p.lon);

    const centerLat = lats.reduce((sum, lat) => sum + lat, 0) / lats.length;
    const centerLng = lngs.reduce((sum, lng) => sum + lng, 0) / lngs.length;

    return {
      ...panel,
      centerLat,
      centerLng,
    };
  });

  // Calculate the overall bounds of the solar farm
  const allLats = panelsWithCenter.map((p) => p.centerLat);
  const allLngs = panelsWithCenter.map((p) => p.centerLng);
  const minLat = Math.min(...allLats);
  const maxLat = Math.max(...allLats);
  const minLng = Math.min(...allLngs);
  const maxLng = Math.max(...allLngs);

  // Calculate the total span of the solar farm
  const latSpan = maxLat - minLat;
  const lngSpan = maxLng - minLng;

  // Determine the number of rows and columns based on the aspect ratio
  // For a rectangular solar farm, we need to estimate the grid structure
  const totalPanels = panelsWithCenter.length;

  // Estimate grid dimensions - assume roughly square-ish panels
  // We'll use the aspect ratio of the solar farm to determine rows vs columns
  const aspectRatio = lngSpan / latSpan;

  // If the solar farm is wider than tall, it has more columns than rows
  // If it's taller than wide, it has more rows than columns
  let estimatedRows, estimatedCols;

  if (aspectRatio > 1.5) {
    // Wide solar farm - more columns than rows
    estimatedCols = Math.ceil(Math.sqrt(totalPanels * aspectRatio));
    estimatedRows = Math.ceil(totalPanels / estimatedCols);
  } else if (aspectRatio < 0.67) {
    // Tall solar farm - more rows than columns
    estimatedRows = Math.ceil(Math.sqrt(totalPanels / aspectRatio));
    estimatedCols = Math.ceil(totalPanels / estimatedRows);
  } else {
    // Roughly square solar farm
    estimatedRows = Math.ceil(Math.sqrt(totalPanels));
    estimatedCols = Math.ceil(totalPanels / estimatedRows);
  }

  // Calculate the expected row height and column width
  const expectedRowHeight = latSpan / estimatedRows;
  const expectedColWidth = lngSpan / estimatedCols;

  // Use a very strict tolerance based on the expected row height
  // This ensures panels are only grouped if they're truly in the same row
  // Reduced from 0.15 to 0.10 for tighter row grouping
  const LATITUDE_TOLERANCE = Math.max(expectedRowHeight * 0.1, 0.00003);

  console.log("Spatial sorting debug:", {
    totalPanels,
    latSpan,
    lngSpan,
    aspectRatio,
    estimatedRows,
    estimatedCols,
    expectedRowHeight,
    expectedColWidth,
    latitudeTolerance: LATITUDE_TOLERANCE,
  });

  // Sort panels by latitude first (top to bottom)
  const sortedByLat = panelsWithCenter.sort(
    (a, b) => b.centerLat - a.centerLat,
  );

  // Group panels into rows using a more robust approach
  const rows = [];
  let currentRow = [];
  let currentRowAvgLat = null;

  sortedByLat.forEach((panel) => {
    if (currentRowAvgLat === null) {
      // First panel - start a new row
      currentRow = [panel];
      currentRowAvgLat = panel.centerLat;
    } else {
      // Check if panel belongs to current row by comparing with row's average latitude
      const rowAvgLat =
        currentRow.reduce((sum, p) => sum + p.centerLat, 0) / currentRow.length;
      const distanceFromRowAvg = Math.abs(panel.centerLat - rowAvgLat);

      if (distanceFromRowAvg < LATITUDE_TOLERANCE) {
        // Panel is in the same row
        currentRow.push(panel);
        // Update the row's average latitude
        currentRowAvgLat =
          currentRow.reduce((sum, p) => sum + p.centerLat, 0) /
          currentRow.length;
      } else {
        // Panel is in a different row - finish current row and start new one
        if (currentRow.length > 0) {
          // Sort the current row by longitude (left to right)
          currentRow.sort((a, b) => a.centerLng - b.centerLng);
          rows.push(currentRow);
        }
        currentRow = [panel];
        currentRowAvgLat = panel.centerLat;
      }
    }
  });

  // Don't forget the last row
  if (currentRow.length > 0) {
    currentRow.sort((a, b) => a.centerLng - b.centerLng);
    rows.push(currentRow);
  }

  // Flatten all rows into a single array
  const spatiallySorted = rows.flat();

  // Remove the temporary center coordinates
  return spatiallySorted.map(({ centerLat, centerLng, ...panel }) => panel);
};

/**
 * Filters and sorts panels based on source model and spatial ordering preference
 * @param {Array} panelData - Raw panel data
 * @param {string} selectedSourceModel - Selected source model filter
 * @param {boolean} useSpatialOrder - Whether to apply spatial sorting
 * @returns {Array} - Filtered and optionally sorted panels
 */
export const getFilteredAndSortedPanels = (
  panelData,
  selectedSourceModel,
  useSpatialOrder,
) => {
  if (!panelData) return [];

  const validPanels = panelData.filter((panel) => {
    const wgs84Points = panel.wgs84_points || [];
    return (
      wgs84Points.length >= 4 &&
      wgs84Points.every(
        (point) =>
          point &&
          typeof point.lat === "number" &&
          typeof point.lon === "number",
      )
    );
  });

  let filteredPanels = validPanels;

  if (selectedSourceModel !== "all") {
    filteredPanels = validPanels.filter(
      (panel) => panel.source_model === selectedSourceModel,
    );
  }

  // Apply spatial sorting if enabled
  if (useSpatialOrder) {
    return sortPanelsSpatially(filteredPanels);
  }

  return filteredPanels;
};

/**
 * Validates if a panel has valid coordinates
 * @param {Object} panel - Panel object to validate
 * @returns {boolean} - True if panel has valid coordinates
 */
export const hasValidCoordinates = (panel) => {
  const wgs84Points = panel.wgs84_points || [];
  return (
    wgs84Points.length >= 4 &&
    wgs84Points.every(
      (point) =>
        point && typeof point.lat === "number" && typeof point.lon === "number",
    )
  );
};

/**
 * Calculates the center point of a panel
 * @param {Object} panel - Panel object with wgs84_points
 * @returns {Object|null} - Center coordinates or null if invalid
 */
export const getPanelCenter = (panel) => {
  if (!hasValidCoordinates(panel)) return null;

  const wgs84Points = panel.wgs84_points;
  const lats = wgs84Points.map((p) => p.lat);
  const lngs = wgs84Points.map((p) => p.lon);

  const centerLat = lats.reduce((sum, lat) => sum + lat, 0) / lats.length;
  const centerLng = lngs.reduce((sum, lng) => sum + lng, 0) / lngs.length;

  return { centerLat, centerLng };
};
