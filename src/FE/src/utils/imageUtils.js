/**
 * Image utility functions for handling thumbnails and downloads
 */

/**
 * Generate a thumbnail URL from a Google Cloud Storage URL
 * @param {string} imageUrl - Original image URL
 * @param {number} width - Desired width for thumbnail (default: 300)
 * @param {number} height - Desired height for thumbnail (default: 300)
 * @returns {string} Thumbnail URL
 */
export const getThumbnailUrl = (imageUrl, width = 300, height = 300) => {
  if (!imageUrl) return "";

  // Check if it's a Google Cloud Storage URL
  if (
    imageUrl.includes("storage.cloud.google.com") ||
    imageUrl.includes("storage.googleapis.com")
  ) {
    // For Google Cloud Storage, we can use the =s parameter for resizing
    // This creates a thumbnail that fits within the specified dimensions
    return `${imageUrl}=s${Math.max(width, height)}`;
  }

  // For other URLs, return the original (could be extended for other services)
  return imageUrl;
};

/**
 * Get different sizes of thumbnail URLs
 * @param {string} imageUrl - Original image URL
 * @returns {object} Object with different thumbnail sizes
 */
export const getThumbnailSizes = (imageUrl) => {
  return {
    small: getThumbnailUrl(imageUrl, 150, 150),
    medium: getThumbnailUrl(imageUrl, 300, 300),
    large: getThumbnailUrl(imageUrl, 600, 600),
    original: imageUrl,
  };
};

/**
 * Download an image from URL
 * @param {string} imageUrl - URL of the image to download
 * @param {string} filename - Filename for the downloaded image
 */
export const downloadImage = async (imageUrl, filename) => {
  try {
    // Ensure URL has protocol
    const fullUrl =
      imageUrl.startsWith("http://") || imageUrl.startsWith("https://")
        ? imageUrl
        : `https://${imageUrl}`;

    // Fetch the image
    const response = await fetch(fullUrl);
    if (!response.ok) {
      throw new Error("Failed to fetch image");
    }

    // Convert to blob
    const blob = await response.blob();

    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename || "image.jpg";

    // Trigger download
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error downloading image:", error);
    throw error;
  }
};

/**
 * Get filename from image URL
 * @param {string} imageUrl - Image URL
 * @returns {string} Extracted filename
 */
export const getImageFilename = (imageUrl) => {
  if (!imageUrl) return "image.jpg";

  // Extract filename from URL
  const urlParts = imageUrl.split("/");
  let filename = urlParts[urlParts.length - 1];

  // Remove query parameters if any
  filename = filename.split("?")[0];

  // If no extension, add .jpg
  if (!filename.includes(".")) {
    filename += ".jpg";
  }

  return filename;
};

/**
 * Preload an image for better UX
 * @param {string} imageUrl - URL of the image to preload
 * @returns {Promise} Promise that resolves when image is loaded
 */
export const preloadImage = (imageUrl) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageUrl;
  });
};
