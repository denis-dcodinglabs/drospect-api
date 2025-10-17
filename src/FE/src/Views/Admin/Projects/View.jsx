import React, { useState, useRef, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { useDispatch, useSelector } from "react-redux";

import axiosInstance from "../../../axiosInstance";
import ImageInfiniteScroll from "../../../components/ImagesInfiniteScroll";
import ModalBox from "../../../components/ModalBox";
import { inputs } from "./Main";
import MapLocation from "../../../components/MapLocation";
import PieGraph from "../../../components/PieChart";
import Loading from "../../../components/Loading";
import Input from "../../../components/formComponents/Input";
import useDebounce from "../../../hooks/useDebounce";
import UploadForm from "../../../components/UploadForm";
import ModalLayout from "../../../components/ModalLayout";
import ProjectHeader from "../../../components/ProjectHeader";
import DeltaFilterControl from "../../../components/DeltaFilterControl";
import useDeltaFilter from "../../../hooks/useDeltaFilter";
import ProjectActions from "../../../components/ProjectActions";
import useGeneratePdf from "../../../hooks/useGeneratePdf";
import useProjectData from "../../../hooks/useProjectData";
import { updateWallet } from "../../../Redux/features/user/userSlice";
import ThermalProcessingContainer from "../../../components/ThermalProcessing/ThermalProcessingContainer";
import ConfirmModal from "../../../components/ConfirmModal";
// import { zoomPlugin } from "@react-pdf-viewer/zoom";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";
import PdfPreview from "../../../components/PdfPreview";
import AIProcessingModal from "../../../components/AIProcessingModal";
import {
  hasAnyRgbPairForItems,
  getPairedItems,
  getThermalOnlyItems,
} from "../../../utils/rgbPairing";

function View({ getImageColorCategory }) {
  const { id } = useParams();
  const dispatch = useDispatch();

  const [loadingModal, setLoadingModal] = useState(false);
  const [loadingFile, setLoadingFile] = useState(false);
  const [loadingClassification, setLoadingClassification] = useState(false);
  const [morePhoto, setMorePhoto] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [imageSelect, setImageSelect] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState();
  const [searchTerm, setSearchTerm] = useState("");
  const [showImage, setShowImage] = useState(false);
  const [image, setImage] = useState({});
  const [open, setOpen] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [openDelete, setOpenDelete] = useState(false);
  const [refreshMap, setRefreshMap] = useState(false);
  const [showDuplicatesFiltered, setShowDuplicatesFiltered] = useState(false);
  const [aiProcessingModalOpen, setAIProcessingModalOpen] = useState(false);
  // const [applyingFilter, setApplyingFilter] = useState(false); // Commented out - not needed right now
  const [deleting, setDeleting] = useState(false);

  const [showRgbPairs, setShowRgbPairs] = useState(false);

  const imageRefs = useRef([]);
  const project_id = parseInt(id);
  const categories = ["In Process", "Healthy", "Not Healthy"];
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const uploadState = useSelector(
    (state) => state.uploadReducer.uploads[project_id],
  );
  const isUploading = uploadState?.loading || false;
  const isModalUpload = uploadState?.isModal || false;

  const getFilteredImageIds = () => {
    // listItems already includes duplicate and delta filters
    // but it's defined below; we return from closure at call time
    try {
      return (listItems || [])
        .filter((img) => img && img.id)
        .map((img) => img.id);
    } catch {
      return [];
    }
  };

  const {
    loadingPdf,
    handleGeneratePdf,
    handlePreviewPdf,
    pdfPreviewUrl,
    clearPdfPreview,
    pdfBlob,
  } = useGeneratePdf(id, getFilteredImageIds);
  // Initialize (kept for potential future use)
  // const zoomPluginInstance = zoomPlugin();
  const {
    project,
    statistics,
    items,
    hasMore,

    isInitialLoading,
    error,
    fetchData,
    setItems,
    setPage,
    setProject,
    duplicateStats,
    clearDuplicateCache,
  } = useProjectData(
    project_id,
    selectedCategory,
    debouncedSearchTerm,
    setSelectedCategory,
    showDuplicatesFiltered,
  );

  // Thermal Processing
  const [isThermalProcessingDisabled, setIsThermalProcessingDisabled] =
    useState(false);
  const [showThermalModelSelection, setShowThermalModelSelection] =
    useState(false);
  // Show Ortho + AI card only when at least one processing task exists
  const [hasOrthoTasks, setHasOrthoTasks] = useState(false);
  const [orthoTaskCount, setOrthoTaskCount] = useState(0); // Add state for task count

  const getCategoryColor = (categoryName) => {
    if (categoryName === "In Process") {
      return "bg-orange-600";
    } else if (categoryName === "Healthy") {
      return "bg-green-600";
    } else if (categoryName === "Not Healthy") {
      return "bg-red-600";
    }
  };
  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm();

  const watchedValues = watch();
  const credits = useSelector((state) => state.userReducer.wallet.credits);

  const handleEdit = () => {
    setOpenEdit((prev) => !prev);
    reset();
  };

  const handleFile = () => {
    setMorePhoto((prev) => !prev);
    reset();
  };

  const handleNextPage = () => {
    fetchData();
    setPage((prevPage) => prevPage + 1);
  };

  const updateData = async (data) => {
    setLoadingModal(true);
    data.megawatt = parseFloat(data.megawatt);
    const { megawatt, name, description } = data;
    const res = await axiosInstance.updateData("/projects/" + id, {
      megawatt,
      name,
      description,
    });
    if (res?.error) {
      setLoadingModal(false);
      return;
    }
    setProject(res?.data.project);
    toast.success("Project was updated successfully!");
    handleEdit();
    setLoadingModal(false);
  };

  const handleCategoryChange = (event) => {
    const category = event.target.value;
    setSelectedCategory(category);
    setPage(2);
    setItems([]);

    // Turn off duplicate filtering if switching away from "Not Healthy"
    if (category !== "Not Healthy" && showDuplicatesFiltered) {
      setShowDuplicatesFiltered(false);
    }

    // Let the useEffect in useProjectData handle the refetch when selectedCategory changes
  };

  const handleImageClick = (image) => {
    if (image) {
      setImage(image);
    }
    setShowImage((prev) => !prev);
  };

  const handleImageSelected = (image) => {
    if (image) {
      setImageSelect(image);
      if (selectedCategory !== "Not Healthy") {
        setSelectedCategory("Not Healthy");
        setPage(1);
        setItems([]);
      }
    }
  };

  const handleImageSelect = (image) => {
    if (image.isInspected === true) {
      return;
    }
    const imageObj = {
      imageId: image.id,
      imageUrl: image.image,
      imageName: image.imageName,
      rgb: image.rgb,
    };
    if (
      selectedImages.some(
        (selectedImage) => selectedImage.imageId === imageObj.imageId,
      )
    ) {
      setSelectedImages(
        selectedImages.filter(
          (selectedImage) => selectedImage.imageId !== imageObj.imageId,
        ),
      );
    } else {
      setSelectedImages([...selectedImages, imageObj]);
    }
  };

  const handleDeleteSelectedImages = async () => {
    setDeleting(true);
    const response = await axiosInstance.deleteData(`/projects/images/delete`, {
      data: { images: selectedImages },
    });
    setDeleting(false);
    if (response.status === "Ok!") {
      setOpenDelete(false);
      toast.success("Images have been successfully deleted");
      setSelectedImages([]);
      setItems([]);
      fetchData(1, false, true);
    } else {
      setOpenDelete(false);
    }
  };

  const handleCloseDelete = () => {
    reset();
    setOpen(!open);
  };

  const handleDelete = () => {
    setOpenDelete(!openDelete);
  };
  const handleInspection = async (data) => {
    setLoadingFile(true);
    const creditsPerUnit =
      data?.altitude === "LOW" || data?.altitude === "ROOF" ? 2 : 1;
    let creditsRequired;
    if (selectedImages.length > 0) {
      creditsRequired = selectedImages.length * creditsPerUnit;
    } else {
      creditsRequired = statistics?.processing * creditsPerUnit;
    }
    if (creditsRequired <= credits) {
      const res = await axiosInstance.postData("/projects/mail", {
        id: project_id,
        projectName: project.name,
        numberOfFiles:
          selectedImages.length > 0
            ? selectedImages.length
            : statistics?.processing,
        altitude: data?.altitude,
        drone: project?.drone,
        selectedImages: selectedImages.length > 0 ? selectedImages : null,
      });
      if (res.error) {
        setLoadingFile(false);
        return;
      }
      setProject((prevProject) => ({ ...prevProject, isinspected: true }));
      const creditsLeft = credits - creditsRequired;
      dispatch(updateWallet({ credits: creditsLeft }));

      // Clear duplicate cache when new processing starts
      clearDuplicateCache();

      toast.success("Processing has started.");
      setLoadingFile(false);

      return;
    }
    toast.error(
      "Processing can't be started because you don't have enough credits.",
    );
    setLoadingFile(false);
  };

  const handleClassification = async () => {
    setLoadingClassification(true);

    try {
      // Get number of files and selected images like the regular inspection
      let numberOfFiles;
      let selectedImagesForClassification = null;

      if (selectedImages.length > 0) {
        // If images are selected, use selected ones
        numberOfFiles = selectedImages.length;
        selectedImagesForClassification = selectedImages;
      } else {
        // Use all unprocessed images from statistics
        numberOfFiles = statistics?.processing || 0;
        selectedImagesForClassification = null;
      }

      if (numberOfFiles === 0) {
        toast.error("No images found for classification.");
        setLoadingClassification(false);
        return;
      }

      // Call the same mail endpoint but with CLASSIFICATION altitude
      const res = await axiosInstance.postData("/projects/mail", {
        id: project_id,
        projectName: project.name,
        numberOfFiles: numberOfFiles,
        altitude: "CLASSIFICATION", // Special altitude for classification
        drone: project?.drone,
        selectedImages: selectedImagesForClassification,
      });

      if (res.error) {
        toast.error("Processing failed. Please try again.");
        setLoadingClassification(false);
        return;
      }

      toast.success(`Processing started!`);
      setLoadingClassification(false);
    } catch (error) {
      console.error("Processing error:", error);
      toast.error("Processing failed. Please try again.");
      setLoadingClassification(false);
    }
  };

  const handleFixes = async (isFixed, id) => {
    const res = await axiosInstance.postData(`/images/${id}/fix`, {
      isFixed,
    });
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    if (res?.success) {
      toast.success("Images changed was updated to isFixed!");
    }

    if (isFixed) {
      setImageSelect(null);
      setRefreshMap(!refreshMap);
    }
  };

  const handleThermalUploadStart = () => {
    setShowThermalModelSelection(true);
  };

  const handleThermalModelSelectionClose = () => {
    setShowThermalModelSelection(false);
  };

  const handleDuplicateFilterToggle = () => {
    setShowDuplicatesFiltered(!showDuplicatesFiltered);
    setItems([]);
    setPage(2);
    // The useEffect will handle the re-fetch when showDuplicatesFiltered changes
  };

  // --- Minimal pairing logic for Thermal (_T) and RGB (_V) images ---
  // (Deprecated local pairing lists; final list derived below via listItems)

  // Delta filter (only for Unhealthy)
  const {
    presets: deltaPresets,
    deltaMin,
    deltaMax,
    activePreset: activeDeltaPreset,
    setPreset: setDeltaPreset,
    setCustom: setDeltaCustom,
    matchesDelta,
  } = useDeltaFilter(project_id);

  const unhealthyDeltaFilteredItems = useMemo(() => {
    if (selectedCategory !== "Not Healthy") return items;
    if (
      activeDeltaPreset === "all" &&
      deltaMin === 0 &&
      deltaMax === Infinity
    ) {
      return items;
    }
    if (!Array.isArray(items) || items.length === 0) return items;
    return items.filter((img) => matchesDelta(img));
  }, [
    items,
    selectedCategory,
    activeDeltaPreset,
    deltaMin,
    deltaMax,
    matchesDelta,
  ]);

  const listItems = useMemo(() => {
    // Start from items already conditioned by duplicate-filter toggle via useProjectData
    const source = unhealthyDeltaFilteredItems || [];
    // Preserve existing pairing behavior
    return showRgbPairs ? getPairedItems(source) : getThermalOnlyItems(source);
  }, [unhealthyDeltaFilteredItems, showRgbPairs]);

  // Detect whether any RGB counterpart exists among currently loaded items
  const hasAnyRgbPair = useMemo(() => hasAnyRgbPairForItems(items), [items]);

  // --- New Handlers for AIProcessingModal ---
  // RGB: Only High Altitude, triggers handleClassification
  const handleSubmitRGB = async () => {
    await handleClassification();
  };

  // Thermal: Passes selected subOption (LOW, HIGH, ROOF) to handleInspection
  const handleSubmitThermal = async (altitude) => {
    await handleInspection({ altitude });
  };

  // Both: If HIGH, call both handleInspection (HIGH) and handleClassification
  const handleSubmitBoth = async (altitude) => {
    if (altitude === "HIGH") {
      await handleInspection({ altitude: "HIGH" });
      await handleClassification();
    }
    if (altitude === "LOW") {
      await Promise.all([
        handleInspection({ altitude: "LOW" }),
        handleClassification(),
      ]);
    }
  };

  // Only show fullscreen loading on initial page load, not on category changes
  if (!project || project?.length === 0) {
    return <Loading fullscreen />;
  }
  return (
    <div className="w-full px-4 h-full">
      <ModalBox
        mode={"edit"}
        title={"Update Project"}
        open={openEdit}
        handleClose={handleEdit}
        handleSubmit={handleSubmit}
        onSubmit={updateData}
        inputs={inputs}
        register={register}
        control={control}
        errors={errors}
        loading={loadingModal}
        data={project}
      />
      <ModalLayout
        open={morePhoto}
        handleClose={handleFile}
        className="w-[400px]"
        innerClassName=" flex-col"
      >
        <h1 className={`text-3xl text-center `}>Upload more images</h1>
        <UploadForm
          project={project}
          fetchData={fetchData}
          setSelectedCategory={setSelectedCategory}
          handleClose={handleFile}
          isModal={true}
        />
      </ModalLayout>
      <ModalBox
        title={"Choose the appropriate model for your data?"}
        buttonTitle={"Submit"}
        formStyle="flex w-full flex-wrap items-center justify-center gap-y-5 gap-x-3"
        titleStyle="text-lg"
        open={open}
        modalClassName={"w-[350px] md:w-[520px]"}
        handleClose={handleCloseDelete}
        handleSubmit={handleSubmit}
        watch={watchedValues}
        selectedImages={selectedImages}
        onSubmit={(data) => {
          handleInspection(data);
          handleCloseDelete();
        }}
        inputs={[
          {
            type: "radio",
            className: "flex gap-y-4 w-full flex-col py-4 px-2 ",
            options: [
              {
                text: "Ground Panels - Low Altitude Flight (15-20m)",
                id: "low",
                name: "altitude",
                altitude: "LOW",
                checked: true,
              },
              {
                text: "Ground Panels - High Altitude Flight (35-45m)",
                id: "high",
                name: "altitude",
                altitude: "HIGH",
                checked: false,
              },
              {
                text: "Roof Top Panels (20-30m above target)",
                id: "roof",
                name: "altitude",
                altitude: "ROOF",
                checked: false,
              },
            ],
          },
        ]}
        register={register}
        errors={errors}
        validation={true}
        imageCounter={statistics?.processing}
        credits={credits}
        loading={loadingModal}
        data={project}
      />
      <ConfirmModal
        title={"Are you sure you want to delete this Images?"}
        handleClose={handleDelete}
        open={openDelete}
        onSubmit={handleDeleteSelectedImages}
        loading={deleting}
        buttonText={"Delete"}
      />
      <AIProcessingModal
        open={aiProcessingModalOpen}
        onClose={() => setAIProcessingModalOpen(false)}
        onSubmitRGB={handleSubmitRGB}
        onSubmitThermal={handleSubmitThermal}
        onSubmitBoth={handleSubmitBoth}
        loading={loadingFile || loadingClassification}
        credits={credits}
        statistics={statistics}
        selectedImages={selectedImages}
      />
      <div className="w-full  flex flex-col md:flex-row ">
        <ProjectHeader project={project} />
        <ProjectActions
          project={project}
          loadingFile={loadingFile}
          loadingPdf={loadingPdf}
          statistics={statistics}
          items={items}
          handleCloseDelete={handleCloseDelete}
          handleEdit={handleEdit}
          setMorePhoto={setMorePhoto}
          handleGeneratePdf={handleGeneratePdf}
          handlePreviewPdf={handlePreviewPdf}
          isUploading={isUploading}
          isModalUpload={isModalUpload}
          onThermalUploadStart={handleThermalUploadStart}
          isThermalProcessingDisabled={isThermalProcessingDisabled}
          onOpenAIProcessingModal={() => setAIProcessingModalOpen(true)}
        />
      </div>
      <PdfPreview
        open={!!pdfPreviewUrl}
        onClose={clearPdfPreview}
        pdfUrl={pdfPreviewUrl}
        projectName={project?.name}
        projectId={id}
        pdfBlob={pdfBlob}
      />
      <div className="flex flex-col-reverse justify-center md:flex-row w-full items-start ">
        <div className="w-full md:w-3/5">
          {(!isUploading || isModalUpload) && project?.imagecounter > 0 ? (
            <div
              className={`justify-center items-center flex-col ${
                hasMore ? " min-h-screen" : " "
              }`}
            >
              {(!isUploading || isModalUpload) && (
                <>
                  <div className="flex md:flex-row flex-col justify-between items-end w-full py-4 md:pt-8">
                    <div>
                      <PieGraph statistics={statistics} />
                    </div>
                    <div className="flex flex-col md:flex-row items-end gap-3">
                      {/* More options dropdown (duplicates + RGB + delta) */}
                      <details className="relative">
                        <summary className="list-none select-none px-3 py-2 rounded-lg text-sm bg-gray-800 text-gray-200 border border-gray-700 cursor-pointer">
                          Advanced Filters
                        </summary>
                        <div className="absolute right-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-3 z-20">
                          {selectedCategory === "Not Healthy" && (
                            <label className="flex items-center justify-between gap-3 text-sm text-gray-300 mb-2">
                              <span>Filter Duplicate Defects</span>
                              <input
                                type="checkbox"
                                checked={showDuplicatesFiltered}
                                onChange={handleDuplicateFilterToggle}
                                className="rounded"
                              />
                            </label>
                          )}
                          <label className="flex items-center justify-between gap-3 text-sm text-gray-300 mb-2">
                            <span>Show RGB images</span>
                            <input
                              type="checkbox"
                              checked={showRgbPairs}
                              onChange={(e) => {
                                const next = e.target.checked;
                                if (next && !hasAnyRgbPair) {
                                  toast.info(
                                    "No RGB images found for the loaded items.",
                                  );
                                }
                                setShowRgbPairs(next);
                              }}
                              className="rounded"
                            />
                          </label>
                          {selectedCategory === "Not Healthy" && (
                            <div className="mt-2 flex items-center justify-between">
                              <span className="text-sm text-gray-300">
                                Delta filter (°C)
                              </span>
                              <DeltaFilterControl
                                presets={deltaPresets}
                                activePreset={activeDeltaPreset}
                                deltaMin={deltaMin}
                                deltaMax={deltaMax}
                                onPreset={setDeltaPreset}
                                onCustom={setDeltaCustom}
                                inline={true}
                                showLabel={false}
                              />
                            </div>
                          )}
                          {showDuplicatesFiltered && duplicateStats && (
                            <div className="text-xs text-gray-400 text-right mt-2">
                              {duplicateStats.duplicatesRemoved} duplicates
                              removed from {duplicateStats.groupsFound} groups
                            </div>
                          )}
                        </div>
                      </details>

                      {/* Category Selector */}
                      <select
                        value={selectedCategory || "In Process"}
                        onChange={handleCategoryChange}
                        className={`text-base font-medium h-full px-3 py-2.5 text-left focus:outline-none rounded-xl ${getCategoryColor(
                          selectedCategory || "In Process",
                        )}`}
                      >
                        {categories?.map((category, index) => (
                          <option key={index} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Action Bar with Search and Buttons */}
                  <div className="flex justify-between w-full items-center gap-3 px-3 py-1 rounded-md ">
                    <div className="flex items-center gap-3">
                      {/* Delete Selected Button */}
                      {selectedImages.length > 0 && (
                        <button
                          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition duration-300"
                          onClick={() => handleDelete()}
                        >
                          Delete Selected ({selectedImages.length})
                        </button>
                      )}

                      {/* Project Details - MegaWatt and Drone Info */}
                      <div className="flex items-center gap-4">
                        {project?.megawatt && (
                          <div className="px-3 py-2 bg-gradient-to-r from-slate-600 to-slate-500 rounded-lg border border-slate-500">
                            <span className="text-slate-100 font-medium text-sm">
                              Megawatt: {project?.megawatt}
                            </span>
                          </div>
                        )}
                        {project?.drone && (
                          <div className="px-3 py-2 bg-gradient-to-r from-slate-600 to-slate-500 rounded-lg border border-slate-500">
                            <span className="text-slate-100 font-medium text-sm">
                              Drone: {project?.drone?.make} -{" "}
                              {project?.drone?.model}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Search Input */}
                    <div className="flex-1 max-w-md">
                      <Input
                        id="search"
                        type="text"
                        placeholder="Search by name"
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                        }}
                        className="w-full px-2 py-3 text-lg text-gray-400 rounded-lg border border-solid border-gray-700 focus:border-pink-600  focus:outline-none  bg-primary mb-2"
                      />
                    </div>
                  </div>

                  {/* Results Info */}
                  {showDuplicatesFiltered && duplicateStats && (
                    <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 mb-4">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-blue-300">
                          📊 Duplicate Analysis Results
                        </span>
                        <span className="text-blue-200">
                          Showing {items.length} images (filtered from{" "}
                          {duplicateStats.totalImages})
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-blue-200">
                        Found {duplicateStats.groupsFound} duplicate groups •
                        Removed {duplicateStats.duplicatesRemoved} redundant
                        images
                      </div>
                    </div>
                  )}

                  {/* Loading indicator for images section only */}
                  {isInitialLoading && (
                    <div className="flex justify-center items-center py-8">
                      <Loading />
                    </div>
                  )}

                  {/* Show images when not initially loading */}
                  {!isInitialLoading && (
                    <ImageInfiniteScroll
                      fetchData={handleNextPage}
                      items={listItems}
                      setItems={setItems}
                      imageRefs={imageRefs}
                      hasMore={hasMore}
                      error={error}
                      getImageColorFilter={getImageColorCategory}
                      handleImageClick={handleImageClick}
                      handleFixes={handleFixes}
                      setImage={setImage}
                      showImage={showImage}
                      image={image}
                      imageSelect={imageSelect}
                      selectedImages={selectedImages}
                      handleImageSelect={handleImageSelect}
                      openDelete={openDelete}
                      handleDelete={handleDelete}
                      handleDeleteSelectedImages={handleDeleteSelectedImages}
                      deleting={deleting}
                    />
                  )}
                </>
              )}
            </div>
          ) : (
            (!openEdit || isUploading) && (
              <UploadForm
                project={project}
                fetchData={fetchData}
                setSelectedCategory={setSelectedCategory}
                isModal={false}
              />
            )
          )}
        </div>
        <div className="flex md:sticky top-0 justify-end items-end flex-col w-full h-max md:w-2/5 md:pl-8 pt-6">
          {/* Ortho + AI Processing Section */}
          {project && (
            <div
              className={`w-full bg-gradient-to-br from-gray-800 to-gray-750 rounded-lg shadow-lg p-4 mb-4 border border-gray-600 ${
                hasOrthoTasks ? "" : "hidden"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-200">
                  Ortho + AI Processing
                </h2>
                <span className="text-xs text-gray-300 bg-gradient-to-r from-gray-700 to-gray-650 px-2 py-1 rounded-full">
                  {orthoTaskCount} task{orthoTaskCount !== 1 ? "s" : ""}
                </span>
              </div>
              <ThermalProcessingContainer
                projectId={project.id}
                project={project}
                onProcessingStateChange={setIsThermalProcessingDisabled}
                showModelSelection={showThermalModelSelection}
                onModelSelectionClose={handleThermalModelSelectionClose}
                onTasksLoaded={setHasOrthoTasks}
                onTaskCountChange={setOrthoTaskCount}
              />
            </div>
          )}

          {project?.longitude && (!isUploading || isModalUpload) && (
            <MapLocation
              id={id}
              longitude={project.longitude}
              imageRefs={imageRefs}
              latitude={project.latitude}
              handleImageClick={handleImageClick}
              setImageSelect={handleImageSelected}
              refresh={refreshMap}
              filteredImages={items}
              showDuplicatesFiltered={showDuplicatesFiltered}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default View;
//602
