import { useState } from "react";
import { toast } from "react-toastify";
import axiosInstance from "../axiosInstance";
const useGeneratePdf = (id, getFilteredImageIds) => {
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const [pdfBlob, setPdfBlob] = useState(null);

  const handleGeneratePdf = async () => {
    setLoadingPdf(true);
    try {
      const ids =
        typeof getFilteredImageIds === "function" ? getFilteredImageIds() : [];
      const hasIds = Array.isArray(ids) && ids.length > 0;
      const pdfResult = hasIds
        ? await axiosInstance.generateUnhealthyImagesPdfForImageIds(id, ids)
        : await axiosInstance.generateUnhealthyImagesPdf(id);
      if (pdfResult.error) {
        throw new Error("Error generating PDF");
      }
      const { blob, filename } = pdfResult;
      setPdfBlob(blob);
      const url = window.URL.createObjectURL(
        new Blob([blob], { type: "application/pdf" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename || "Inspection Report.pdf");
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("PDF generated successfully");
    } catch (error) {
      toast.error("Failed to generate PDF");
    } finally {
      setLoadingPdf(false);
    }
  };

  const handlePreviewPdf = async () => {
    setLoadingPdf(true);
    try {
      const ids =
        typeof getFilteredImageIds === "function" ? getFilteredImageIds() : [];
      const hasIds = Array.isArray(ids) && ids.length > 0;
      const pdfResult = hasIds
        ? await axiosInstance.generateUnhealthyImagesPdfForImageIds(id, ids)
        : await axiosInstance.generateUnhealthyImagesPdf(id);
      if (pdfResult.error) {
        throw new Error("Error generating PDF");
      }
      const { blob } = pdfResult;
      setPdfBlob(blob);
      const url = window.URL.createObjectURL(
        new Blob([blob], { type: "application/pdf" }),
      );
      setPdfPreviewUrl(url);
    } catch (error) {
      toast.error("Failed to generate PDF");
    } finally {
      setLoadingPdf(false);
    }
  };

  const clearPdfPreview = () => {
    if (pdfPreviewUrl) {
      window.URL.revokeObjectURL(pdfPreviewUrl);
      setPdfPreviewUrl(null);
    }
  };

  return {
    loadingPdf,
    handleGeneratePdf,
    handlePreviewPdf,
    pdfPreviewUrl,
    clearPdfPreview,
    pdfBlob,
  };
};

export default useGeneratePdf;
