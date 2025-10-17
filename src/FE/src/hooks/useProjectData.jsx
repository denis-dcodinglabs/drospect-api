import { useState, useEffect } from "react";
import axiosInstance from "../axiosInstance";

const useProjectData = (
  projectId,
  selectedCategory = "In Process",
  debouncedSearchTerm,
  setSelectedCategory,
  showDuplicatesFiltered = false,
) => {
  const [project, setProject] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(2);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [error, setError] = useState(null);
  const [duplicateStats, setDuplicateStats] = useState(null);

  // Cache management for duplicate filter results
  const CACHE_KEY = `duplicate_filter_${projectId}`;
  const CACHE_EXPIRY_KEY = `duplicate_filter_expiry_${projectId}`;
  const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

  const getCachedDuplicateData = () => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      const expiry = localStorage.getItem(CACHE_EXPIRY_KEY);

      if (cached && expiry) {
        const expiryTime = parseInt(expiry);
        if (Date.now() < expiryTime) {
          console.log("Using cached duplicate filter data");
          return JSON.parse(cached);
        } else {
          console.log("Cache expired, removing old data");
          localStorage.removeItem(CACHE_KEY);
          localStorage.removeItem(CACHE_EXPIRY_KEY);
        }
      }
    } catch (error) {
      console.error("Error reading cache:", error);
    }
    return null;
  };

  const setCachedDuplicateData = (data) => {
    try {
      const expiryTime = Date.now() + CACHE_DURATION;
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      localStorage.setItem(CACHE_EXPIRY_KEY, expiryTime.toString());
      console.log("Cached duplicate filter data for 30 minutes");
    } catch (error) {
      console.error("Error saving to cache:", error);
    }
  };

  const clearDuplicateCache = () => {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_EXPIRY_KEY);
    console.log("Cleared duplicate filter cache");
  };

  const fetchProjectData = async () => {
    const res = await axiosInstance.getData(`/projects/${projectId}`);
    if (res.error) return;

    setProject(res.data.project);
    setStatistics(res.data.panelStatistics);
    setSelectedCategory(
      res?.data.panelStatistics?.processing === 0
        ? "Not Healthy"
        : "In Process",
    );
  };

  // Normal image fetching (back to original logic like your old code)
  const fetchData = (ispage, isUpload, refreshProject) => {
    if (isLoading) return;
    setIsLoading(true);
    axiosInstance
      .getData(
        `/projects/images/${projectId}?page=${ispage || page}&limit=${
          selectedCategory === "Not Healthy" ? "9999" : "30"
        }${
          selectedCategory === "In Process"
            ? "&isHealthy=true&isInspected=false"
            : `&isHealthy=${selectedCategory === "Healthy"}&isInspected=true`
        }&searchTerm=${debouncedSearchTerm}`,
      )
      .then((res) => {
        if (isUpload) {
          setItems([...res?.data?.images]);
        } else {
          setItems((prevItems) => [...prevItems, ...res?.data?.images]);
        }
        if (refreshProject) {
          fetchProjectData();
        }
        setHasMore(res?.data?.moreImages);
        setDuplicateStats(null); // Clear duplicate stats for normal fetching
      })
      .catch((err) => {
        setError(err);
      });

    setIsLoading(false);
  };

  // Separate duplicate filtering function with caching
  const fetchDuplicateFilteredData = () => {
    if (isLoading) return;

    // Check cache first
    const cachedData = getCachedDuplicateData();
    if (cachedData) {
      console.log("Using cached duplicate filter results");

      let filteredImages = cachedData.filteredImages || [];

      // Apply category filtering to cached results
      if (selectedCategory === "In Process") {
        filteredImages = filteredImages.filter(
          (img) => !img.isInspected && img.isHealthy,
        );
      } else if (selectedCategory === "Healthy") {
        filteredImages = filteredImages.filter(
          (img) => img.isInspected && img.isHealthy,
        );
      } else if (selectedCategory === "Not Healthy") {
        filteredImages = filteredImages.filter(
          (img) => img.isInspected && !img.isHealthy,
        );
      }

      // Apply search filtering to cached results
      if (debouncedSearchTerm) {
        filteredImages = filteredImages.filter((img) =>
          img.imageName
            ?.toUpperCase()
            .includes(debouncedSearchTerm.toUpperCase()),
        );
      }

      setItems(filteredImages);
      setDuplicateStats(cachedData.stats);
      setHasMore(false);
      return;
    }

    // No cache available, make API call
    setIsInitialLoading(true);
    setIsLoading(true);

    // 🔧 DUPLICATE FILTERING PARAMETERS - Change these values to experiment:
    const RADIUS_METERS = 15; // GPS distance in meters (5-25 recommended)
    const TIME_WINDOW_SECONDS = 15; // Time window in seconds (10-60 recommended)

    const filterParams = {
      projectId: parseInt(projectId),
      radiusMeters: RADIUS_METERS,
      timeWindowSeconds: TIME_WINDOW_SECONDS,
      onlyUnhealthy: true, // Only process inspected unhealthy images
    };

    console.log("Fetching duplicate filtered images");

    axiosInstance
      .postData("/projects/images/duplicates/analyze", filterParams)
      .then((res) => {
        if (res.error) {
          console.error("Duplicate filter error:", res.error);
          setError(res.error);
          setIsLoading(false);
          setIsInitialLoading(false);
          return;
        }

        console.log("Duplicate filter completed");

        // Cache the raw API response
        setCachedDuplicateData({
          filteredImages: res?.data?.filteredImages || [],
          stats: res?.data?.stats,
        });

        let filteredImages = res?.data?.filteredImages || [];

        // Apply category filtering to duplicate results
        if (selectedCategory === "In Process") {
          filteredImages = filteredImages.filter(
            (img) => !img.isInspected && img.isHealthy,
          );
        } else if (selectedCategory === "Healthy") {
          filteredImages = filteredImages.filter(
            (img) => img.isInspected && img.isHealthy,
          );
        } else if (selectedCategory === "Not Healthy") {
          filteredImages = filteredImages.filter(
            (img) => img.isInspected && !img.isHealthy,
          );
        }

        // Apply search filtering
        if (debouncedSearchTerm) {
          filteredImages = filteredImages.filter((img) =>
            img.imageName
              ?.toUpperCase()
              .includes(debouncedSearchTerm.toUpperCase()),
          );
        }

        setItems(filteredImages);
        setDuplicateStats(res?.data?.stats);
        setHasMore(false); // No pagination for filtered results
        setIsLoading(false);
        setIsInitialLoading(false);
      })
      .catch((err) => {
        console.error("Duplicate filter request failed:", err);
        setError(err);
        setIsLoading(false);
        setIsInitialLoading(false);
      });
  };

  // Decide which fetch function to use
  useEffect(() => {
    if (showDuplicatesFiltered && selectedCategory === "Not Healthy") {
      fetchDuplicateFilteredData();
    } else {
      fetchData(1, true);
    }
  }, [
    projectId,
    selectedCategory,
    debouncedSearchTerm,
    showDuplicatesFiltered,
  ]);

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  return {
    project,
    statistics,
    items,
    page,
    hasMore,
    isLoading,
    isInitialLoading,
    error,
    fetchProjectData,
    fetchData,
    setPage,
    setItems,
    setProject,
    duplicateStats,
    clearDuplicateCache, // Expose cache clearing function
  };
};

export default useProjectData;
