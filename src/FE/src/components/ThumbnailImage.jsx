import React, { useState } from "react";

/**
 * Simple Thumbnail Image Component
 * Uses thumbnailUrl if available, falls back to original image
 * Perfect for image grids and lists
 */
const ThumbnailImage = ({
  src,
  thumbnailUrl,
  alt = "",
  className = "",
  onClick,
  onDoubleClick,
  loading = "lazy",
  ...props
}) => {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Helper function to ensure URL has protocol
  const ensureProtocol = (url) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    return `https://${url}`;
  };

  // Determine which image to show
  const imageSrc =
    !imageError && thumbnailUrl
      ? ensureProtocol(thumbnailUrl)
      : ensureProtocol(src);

  const handleError = () => {
    if (thumbnailUrl && !imageError) {
      // If thumbnail fails, try original image
      setImageError(true);
    }
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  return (
    <div className="relative">
      {/* Loading placeholder */}
      {isLoading && (
        <div
          className={`absolute inset-0 bg-gray-200 animate-pulse rounded ${className}`}
        >
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
          </div>
        </div>
      )}

      {/* Actual image */}
      <img
        src={imageSrc}
        alt={alt}
        className={className}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        onError={handleError}
        onLoad={handleLoad}
        loading={loading}
        {...props}
      />
    </div>
  );
};

export default ThumbnailImage;
