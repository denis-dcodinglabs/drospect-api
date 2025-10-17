import { parseMetadata } from "@uswriting/exiftool";

export async function isThermalImage(file) {
  try {
    const { success, data, error } = await parseMetadata(file);

    if (!success) {
      console.debug("ExifTool parse error:", error);
      return false;
    }

    console.log("EXIF data for", file.name, ":", data);
    console.log("Data type:", typeof data);

    // Since data is a formatted text string, parse it line by line
    let parsedData = {};
    if (typeof data === "string") {
      const lines = data.split("\n");
      for (const line of lines) {
        const colonIndex = line.indexOf(":");
        if (colonIndex > 0) {
          const key = line.substring(0, colonIndex).trim();
          const value = line.substring(colonIndex + 1).trim();
          if (key && value) {
            parsedData[key] = value;
          }
        }
      }
      console.log("Parsed EXIF data object:", parsedData);
    } else {
      parsedData = data;
    }

    // Check if ANY EXIF data exists (this means the image has metadata)
    const hasAnyExifData = parsedData && Object.keys(parsedData).length > 0;

    if (!hasAnyExifData) {
      console.debug("No EXIF data found in image");
      return false;
    }

    console.log(parsedData, "thermal data");

    // Debug: Check what thermal-related keys exist
    const allKeys = Object.keys(parsedData);
    const thermalKeys = allKeys.filter(
      (key) =>
        key.toLowerCase().includes("thermal") ||
        key.toLowerCase().includes("flir"),
    );
    console.log("Thermal-related keys found:", thermalKeys);

    // Check if thermal data exists - using the actual field names we see in the EXIF
    const hasThermalData = !!(
      parsedData["Thermal Data"] || // DJI thermal data
      parsedData["Thermal Calibration"] || // DJI thermal calibration
      parsedData.RawThermalImage ||
      parsedData.ThermalData ||
      parsedData.ThermalCalibration
    );

    console.log("Thermal data check results:", {
      "Thermal Data": !!parsedData["Thermal Data"],
      "Thermal Calibration": !!parsedData["Thermal Calibration"],
      RawThermalImage: !!parsedData.RawThermalImage,
      ThermalData: !!parsedData.ThermalData,
      ThermalCalibration: !!parsedData.ThermalCalibration,
      hasThermalData: hasThermalData,
    });

    if (hasThermalData) {
      console.debug("Thermal data found");
      return true;
    }

    // Check for specific thermal color modes as fallback
    const desc =
      parsedData["Image Description"]?.toLowerCase() ||
      parsedData.ImageDescription?.toLowerCase() ||
      "";
    let thermalReason = "";

    if (desc.includes("whitehot")) {
      thermalReason = "whitehot";
    } else if (desc.includes("blackhot")) {
      thermalReason = "blackhot";
    } else if (desc.includes("redhot")) {
      thermalReason = "redhot";
    } else if (desc.includes("yellowhot")) {
      thermalReason = "yellowhot";
    } else if (desc.includes("rainbow")) {
      thermalReason = "rainbow";
    } else if (desc.includes("ironbow")) {
      thermalReason = "ironbow";
    } else if (desc.includes("ironred")) {
      thermalReason = "ironred";
    }

    if (thermalReason) {
      console.debug(`Thermal detected via color mode: ${thermalReason}`);
      return true;
    }

    // Not thermal, but has metadata
    console.debug("Image has EXIF metadata but no thermal indicators detected");
    return false;
  } catch (err) {
    console.debug("Error checking thermal data:", err);
    return false;
  }
}

// Separate function to check if image has any metadata at all
export async function hasMetadata(file) {
  try {
    const { success, data, error } = await parseMetadata(file);

    if (!success) {
      console.debug("ExifTool parse error:", error);
      return false;
    }

    // Parse data if it's a string
    let parsedData = {};
    if (typeof data === "string") {
      const lines = data.split("\n");
      for (const line of lines) {
        const colonIndex = line.indexOf(":");
        if (colonIndex > 0) {
          const key = line.substring(0, colonIndex).trim();
          const value = line.substring(colonIndex + 1).trim();
          if (key && value) {
            parsedData[key] = value;
          }
        }
      }
    } else {
      parsedData = data;
    }

    // Check if ANY EXIF data exists
    const hasAnyExifData = parsedData && Object.keys(parsedData).length > 0;

    if (hasAnyExifData) {
      console.debug("Image has metadata");
      return true;
    } else {
      console.debug("Image has no metadata");
      return false;
    }
  } catch (err) {
    console.debug("Error checking metadata:", err);
    return false;
  }
}
