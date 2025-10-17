import React, { useState } from "react";
import { getThumbnailUrl } from "../utils/imageUtils";

/**
 * OptimizedImage component that automatically loads thumbnails for better performance
 * Falls back to original image if thumbnail fails to load
 */
const OptimizedImage = ({
  src,
  alt = "",
  width,
  height,
  className = "",
  thumbnailSize = 300,
  onClick,
  loading = "lazy",
  ...props
}) => {
  const [imageSrc, setImageSrc] = useState(
    getThumbnailUrl(src, thumbnailSize, thumbnailSize),
  );
  const [isError, setIsError] = useState(false);

  const handleError = () => {
    if (!isError) {
      setIsError(true);
      setImageSrc(src); // Fallback to original image
    }
  };

  const handleLoad = () => {
    setIsError(false);
  };

  return (
    <img
      src={imageSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onClick={onClick}
      loading={loading}
      onError={handleError}
      onLoad={handleLoad}
      {...props}
    />
  );
};

export default OptimizedImage;
