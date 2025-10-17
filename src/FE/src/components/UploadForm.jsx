import React, { useState, useRef, useEffect } from "react";
import { toast } from "react-toastify";
import { useDispatch, useSelector } from "react-redux";
import axiosInstance from "../axiosInstance";
import Button from "../components/formComponents/Button";
import FileUpload from "../components/FileUpload";
import useRefreshToken from "../hooks/useRefreshToken";
import useUploadWarning from "../hooks/useUploadWarning";
import { hasMetadata } from "../utils/isThermalImage";
import { compressImageIfNeeded } from "../utils/imageCompression";
import {
  setUploadProgress,
  clearUploadProgress,
} from "../Redux/features/upload/uploadSlice";

const CHUNK_SIZE = 10;
const REFRESH_THRESHOLD = 100;

const UploadForm = ({
  project,
  fetchData,
  setSelectedCategory,
  handleClose,
  isModal = false,
}) => {
  const dispatch = useDispatch();
  const [file, setFile] = useState([]);
  const [error, setError] = useState(false);
  const refreshToken = useRefreshToken();
  const anyWithoutMetadataRef = useRef(false);

  const uploadState = useSelector(
    (state) => state.uploadReducer.uploads[project?.id],
  );
  const uploadProgress = uploadState?.progress || 0;
  const loadingFile = uploadState?.loading || false;
  const totalFiles = uploadState?.totalFiles || 0;
  const isModalUpload = uploadState?.isModal || false;

  useEffect(() => {
    return () => {
      if (project?.id) {
        dispatch(clearUploadProgress({ projectId: project.id }));
      }
    };
  }, [project?.id, dispatch]);

  const onSubmit = async (e) => {
    e.preventDefault();
    const fileArray = Array.from(file);
    dispatch(
      setUploadProgress({
        projectId: project.id,
        progress: 0,
        loading: true,
        totalFiles: fileArray.length,
        isModal,
      }),
    );
    setError(false);

    const hasFiles = file.length > 0;
    if (!hasFiles) {
      toast.error("No valid images to upload.");
      dispatch(
        setUploadProgress({
          projectId: project.id,
          progress: 0,
          loading: false,
          totalFiles: 0,
          isModal,
        }),
      );
      return;
    }

    anyWithoutMetadataRef.current = false;
    let previousUploadedBytes = 0;
    let totalUploadedImages = 0;
    const totalBytes = fileArray.reduce((acc, f) => acc + (f.size || 0), 0);

    const updateProgress = (progressEvent) => {
      const chunkProgress = progressEvent.loaded;
      const totalUploadedBytes = previousUploadedBytes + chunkProgress;
      const percentCompleted = Math.min(
        Math.round((totalUploadedBytes / totalBytes) * 100),
        100,
      );

      dispatch(
        setUploadProgress({
          projectId: project.id,
          progress: percentCompleted,
          loading: true,
          totalFiles: fileArray.length,
          isModal,
        }),
      );
    };

    try {
      for (let i = 0; i < fileArray.length; i += CHUNK_SIZE) {
        const chunk = fileArray.slice(i, i + CHUNK_SIZE);
        const formData = new FormData();

        for (const f of chunk) {
          // Check if image has metadata
          const imageHasMetadata = await hasMetadata(f);
          if (!imageHasMetadata) {
            anyWithoutMetadataRef.current = true;
          }

          // Compress image if over 1MB while preserving metadata
          // Thermal detection will be done on the backend
          try {
            const processedFile = await compressImageIfNeeded(f);
            formData.append("files", processedFile);
          } catch (compressErr) {
            console.error("Compression error:", compressErr);
            formData.append("files", f);
          }
        }

        formData.append(
          "properties",
          JSON.stringify({ id: project?.id, drone: Boolean(project?.drone) }),
        );

        await axiosInstance.postData("/projects/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: updateProgress,
        });

        totalUploadedImages += chunk.length;
        previousUploadedBytes += chunk.reduce(
          (acc, f) => acc + (f.size || 0),
          0,
        );

        if (
          totalUploadedImages > 0 &&
          totalUploadedImages % REFRESH_THRESHOLD === 0
        ) {
          await refreshToken();
        }
      }

      if (anyWithoutMetadataRef.current) {
        toast.error(
          "Some images lacked metadata. Metadata images are required for inspection.",
        );
      } else {
        toast.success("Files uploaded successfully!");
      }

      setFile([]);
      setSelectedCategory("In Process");
      fetchData(1, true, true);
      if (handleClose) handleClose();
    } catch (err) {
      console.error("Upload failed:", err);
      toast.error("Upload failed. Please try again.");
    } finally {
      dispatch(
        setUploadProgress({
          projectId: project.id,
          progress: 0,
          loading: false,
          totalFiles: 0,
          isModal,
        }),
      );
    }

    const properties = {
      id: project?.id,
    };

    axiosInstance.postData("/projects/upload/zip", properties, {
      headers: { "Content-Type": "application/json" },
    });
  };

  useUploadWarning(loadingFile);

  return (
    <form
      className="flex flex-col items-center w-full py-4 md:py-10"
      onSubmit={onSubmit}
    >
      <FileUpload
        file={file}
        setFile={setFile}
        error={error}
        uploadProgress={uploadProgress}
        loading={loadingFile}
        totalFiles={totalFiles}
      />
      <Button
        type="submit"
        text={loadingFile ? "Uploading…" : "Upload"}
        disabled={loadingFile || file.length === 0}
        className="rounded-full px-6"
      />
    </form>
  );
};

export default UploadForm;
