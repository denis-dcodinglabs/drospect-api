import React, { useState, useEffect, useRef, useCallback } from "react";
import "./ProgressiveImage.css";

/**
 * Progressive Image Component
 * Shows a blurred thumbnail first, then smoothly transitions to full-size image
 */
const ProgressiveImage = ({
  src,
  alt = "",
  className = "",
  thumbnailSize = "thumb_300",
  blurAmount = "blur_thumb",
  transitionDuration = 700,
  placeholder = null,
  onLoad = () => {},
  onError = () => {},
  eager = false,
  ...props
}) => {
  const [imageState, setImageState] = useState("loading"); // loading, thumbnail, loaded, error
  const [thumbnailSrc, setThumbnailSrc] = useState("");
  const [blurSrc, setBlurSrc] = useState("");
  const [fullSrc, setFullSrc] = useState("");
  const fullImageRef = useRef(null);
  const thumbnailRef = useRef(null);
  const intersectionRef = useRef(null);

  /**
   * Generate thumbnail URLs from original image URL
   */
  const generateThumbnailUrls = useCallback(
    (originalUrl) => {
      if (!originalUrl) return { blur: "", thumbnail: "", full: originalUrl };

      // Extract bucket and file path from GCS URL
      const isGCS =
        originalUrl.includes("storage.googleapis.com") ||
        originalUrl.includes("storage.cloud.google.com");

      if (isGCS) {
        // For GCS URLs, construct thumbnail paths
        const urlParts = originalUrl.split("/");
        const bucketName = urlParts[3];
        const filePath = urlParts.slice(4).join("/");
        const fileBaseName = filePath.substring(0, filePath.lastIndexOf("."));

        const baseUrl = `https://storage.googleapis.com/${bucketName}/thumbnails/${fileBaseName}`;

        return {
          blur: `${baseUrl}_${blurAmount}.jpg`,
          thumbnail: `${baseUrl}_${thumbnailSize}.jpg`,
          full: originalUrl,
        };
      }

      // Fallback for non-GCS URLs
      return {
        blur: originalUrl,
        thumbnail: originalUrl,
        full: originalUrl,
      };
    },
    [thumbnailSize, blurAmount],
  );

  /**
   * Preload an image and return a promise
   */
  const preloadImage = useCallback((url) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }, []);

  /**
   * Load images progressively
   */
  const loadImages = useCallback(async () => {
    if (!src) return;

    try {
      const urls = generateThumbnailUrls(src);
      setBlurSrc(urls.blur);
      setThumbnailSrc(urls.thumbnail);
      setFullSrc(urls.full);

      // Load blur image first (smallest, fastest)
      if (urls.blur !== urls.full) {
        try {
          await preloadImage(urls.blur);
          setImageState("blur");
        } catch (error) {
          console.warn("Blur image failed to load:", error);
        }
      }

      // Load thumbnail
      if (urls.thumbnail !== urls.full) {
        try {
          await preloadImage(urls.thumbnail);
          setImageState("thumbnail");
        } catch (error) {
          console.warn("Thumbnail failed to load:", error);
        }
      }

      // Load full image
      try {
        await preloadImage(urls.full);
        setImageState("loaded");
        onLoad();
      } catch (error) {
        console.error("Full image failed to load:", error);
        setImageState("error");
        onError(error);
      }
    } catch (error) {
      console.error("Error loading images:", error);
      setImageState("error");
      onError(error);
    }
  }, [src, generateThumbnailUrls, preloadImage, onLoad, onError]);

  /**
   * Intersection Observer for lazy loading
   */
  useEffect(() => {
    if (eager || !intersectionRef.current) {
      loadImages();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            loadImages();
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 },
    );

    observer.observe(intersectionRef.current);

    return () => observer.disconnect();
  }, [loadImages, eager]);

  /**
   * Get current image source based on state
   */
  const getCurrentSrc = () => {
    switch (imageState) {
      case "blur":
        return blurSrc;
      case "thumbnail":
        return thumbnailSrc;
      case "loaded":
        return fullSrc;
      default:
        return "";
    }
  };

  /**
   * Get CSS classes for current state
   */
  const getImageClasses = () => {
    const baseClasses = "progressive-image__img";
    const stateClasses = {
      loading: "progressive-image__img--loading",
      blur: "progressive-image__img--blur",
      thumbnail: "progressive-image__img--thumbnail",
      loaded: "progressive-image__img--loaded",
      error: "progressive-image__img--error",
    };

    return `${baseClasses} ${stateClasses[imageState]} ${className}`;
  };

  if (imageState === "error") {
    return (
      <div
        ref={intersectionRef}
        className={`progressive-image progressive-image--error ${className}`}
        {...props}
      >
        {placeholder || (
          <div className="progressive-image__error">
            <span>⚠️ Failed to load image</span>
          </div>
        )}
      </div>
    );
  }

  if (imageState === "loading") {
    return (
      <div
        ref={intersectionRef}
        className={`progressive-image progressive-image--loading ${className}`}
        {...props}
      >
        {placeholder || (
          <div className="progressive-image__placeholder">
            <div className="progressive-image__spinner"></div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={intersectionRef}
      className={`progressive-image progressive-image--${imageState}`}
      style={{ "--transition-duration": `${transitionDuration}ms` }}
    >
      <img
        ref={imageState === "loaded" ? fullImageRef : thumbnailRef}
        src={getCurrentSrc()}
        alt={alt}
        className={getImageClasses()}
        {...props}
      />

      {/* Loading overlay for visual feedback */}
      {imageState !== "loaded" && (
        <div className="progressive-image__overlay">
          <div className="progressive-image__loader"></div>
        </div>
      )}
    </div>
  );
};

export default ProgressiveImage;
