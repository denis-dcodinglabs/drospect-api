// Image-related utility functions for PDF generation

/**
 * Extract a shorter, cleaner image name from the full filename
 */
export function formatImageName(fullName: string): string {
  if (!fullName) return "Unnamed";

  // Extract pattern like DJI_YYYYMMDDHHMMSS_XXXX_T.JPG to DJI_XXXX_T.JPG
  const match = fullName.match(/DJI_\d{14}_(\d{4}_[A-Z]\.JPG)/i);
  if (match) {
    return `DJI_${match[1]}`;
  }

  // If pattern doesn't match, just return the filename without path
  return fullName.split("/").pop() || fullName;
}

// TODO: Add image/map fetching helpers if needed
