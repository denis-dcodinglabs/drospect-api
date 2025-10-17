import { useState } from "react";
import axiosInstance from "../axiosInstance";
import { toast } from "react-toastify";

const useProjectActions = (projectId) => {
  const [loadingFile, setLoadingFile] = useState(false);

  const handleInspection = async (data) => {
    setLoadingFile(true);
    try {
      await axiosInstance.postData("/projects/mail", {
        id: projectId,
        numberOfFiles: data.numberOfFiles,
        altitude: data.altitude,
      });
      toast.success("Processing started.");
    } finally {
      setLoadingFile(false);
    }
  };

  return { handleInspection, loadingFile };
};

export default useProjectActions;
