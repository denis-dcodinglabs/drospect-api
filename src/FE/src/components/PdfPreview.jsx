import React, { useState, useEffect } from "react";
import ModalLayout from "./ModalLayout";
import { Worker, Viewer, SpecialZoomLevel } from "@react-pdf-viewer/core";
import { zoomPlugin } from "@react-pdf-viewer/zoom";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";
import "@react-pdf-viewer/zoom/lib/styles/index.css";
import { toast } from "react-toastify";
import axiosInstance from "../axiosInstance";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faShare, faXmark } from "@fortawesome/free-solid-svg-icons";

const PdfPreview = ({
  open,
  onClose,
  pdfUrl,
  projectName,
  projectId,
  pdfBlob,
}) => {
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [pdfBlobState, setPdfBlobState] = useState(pdfBlob || null); // Store the generated PDF blob
  // Track zoom state to force update if needed
  const [zoom, setZoom] = useState(1.2); // Default 120%
  const zoomPluginInstance = zoomPlugin();
  const { ZoomPopover, zoomTo } = zoomPluginInstance;

  // Set default zoom to 120% on mount or when pdfUrl changes
  useEffect(() => {
    setZoom(1.2);
    // Delay to ensure Viewer is mounted before zooming
    setTimeout(() => {
      zoomTo(1.2);
    }, 100);
    // eslint-disable-next-line
  }, [pdfUrl]);

  return (
    <ModalLayout
      open={open}
      handleClose={onClose}
      className="w-[95vw] h-[95vh] max-w-7xl max-h-[95vh]"
    >
      <div className="w-full h-full flex flex-col items-center justify-center">
        <div className="w-full h-full relative" style={{ minHeight: 600 }}>
          <div className="absolute top-4 right-5 z-10 flex flex-col items-end gap-2">
            <div className="flex gap-2">
              <button
                className={`px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-60 flex items-center justify-center ${
                  shareLoading ? "animate-pulse" : ""
                }`}
                disabled={shareLoading}
                title={
                  shareLoading
                    ? "Generating and uploading PDF..."
                    : "Share Report"
                }
                onClick={async () => {
                  try {
                    setShareLoading(true);

                    let blobToShare = pdfBlobState || pdfBlob;

                    // If no PDF blob exists, generate it first
                    if (!blobToShare) {
                      const pdfResult =
                        await axiosInstance.generateUnhealthyImagesPdf(
                          projectId,
                        );
                      if (pdfResult.error)
                        throw new Error("Error generating PDF");
                      blobToShare = pdfResult.blob;
                      setPdfBlobState(blobToShare); // Store for potential future use
                    }

                    const result = await axiosInstance.sharePdfReportWithBlob(
                      blobToShare,
                      projectName || "Project",
                    );

                    if (result.error) throw new Error("Error sharing PDF");
                    if (
                      !result.shareUrl ||
                      !result.shareUrl.startsWith("https://")
                    ) {
                      throw new Error("Invalid share URL received");
                    }
                    setShareUrl(result.shareUrl);
                    setShowShareModal(true);
                    toast.success("PDF shared successfully!");
                  } catch (error) {
                    const message =
                      error.response?.data?.error || "Failed to share PDF";
                    toast.error(message);
                  } finally {
                    setShareLoading(false);
                  }
                }}
              >
                <FontAwesomeIcon icon={faShare} />
              </button>
              <button
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition disabled:opacity-60"
                disabled={downloadLoading}
                onClick={async () => {
                  try {
                    setDownloadLoading(true);
                    const pdfResult =
                      await axiosInstance.generateUnhealthyImagesPdf(projectId);
                    if (pdfResult.error)
                      throw new Error("Error generating PDF");
                    const { blob, filename } = pdfResult;

                    // Store the blob for sharing
                    setPdfBlobState(blob);

                    const url = window.URL.createObjectURL(
                      new Blob([blob], { type: "application/pdf" }),
                    );
                    const link = document.createElement("a");
                    link.href = url;
                    link.setAttribute(
                      "download",
                      filename ||
                        (projectName
                          ? `${projectName} - Inspection Report.pdf`
                          : "Inspection Report.pdf"),
                    );
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                    setTimeout(() => window.URL.revokeObjectURL(url), 1000);
                  } catch (error) {
                    toast.error("Failed to download PDF");
                  } finally {
                    setDownloadLoading(false);
                  }
                }}
              >
                {downloadLoading ? "Downloading..." : "Download Report"}
              </button>
            </div>
            {/* Custom ZoomPopover with levels and onZoom handler */}
            <ZoomPopover
              plugin={zoomPluginInstance}
              levels={[0.5, 0.75, 1, 1.2, 1.5, 2, 3, 4]}
              onZoom={(newZoom) => {
                setZoom(newZoom);
                zoomTo(newZoom);
              }}
            />
          </div>
          <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
            <Viewer
              fileUrl={pdfUrl}
              plugins={[zoomPluginInstance]}
              defaultScale={1.2}
              // key={zoom} // Uncomment if Viewer needs to be forced to re-render
            />
          </Worker>
        </div>
      </div>

      {/* Share Modal */}
      <ModalLayout
        open={showShareModal}
        handleClose={() => setShowShareModal(false)}
        className="w-[85vw] max-w-sm"
      >
        <div className="p-4">
          {/* Centered Content */}
          <div className="text-center">
            {/* Success Icon */}
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
              <FontAwesomeIcon
                icon={faShare}
                className="text-green-600 text-lg"
              />
            </div>

            {/* Title */}
            <h3 className="text-lg font-semibold text-white mb-2">
              Report Shared Successfully!
            </h3>

            {/* Description */}
            <p className="text-sm text-gray-300 mb-4 leading-relaxed">
              Your report is now live and ready to share with others
            </p>

            {/* URL Card */}
            <div className="bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg p-3 mb-4">
              <p className="text-xs text-gray-400 mb-2 font-medium">
                Shareable Link:
              </p>
              <div className="bg-gray-700 border border-gray-600 rounded p-2">
                <p className="text-xs text-white break-all font-mono leading-relaxed">
                  {shareUrl}
                </p>
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(shareUrl);
                  toast.success("Link copied to clipboard!");
                } catch (error) {
                  toast.error("Failed to copy link");
                }
              }}
              className="w-full bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition font-medium text-sm flex items-center justify-center gap-2 mb-2"
            >
              <FontAwesomeIcon icon={faShare} className="text-sm" />
              Copy Link to Share
            </button>

            {/* Secondary Action */}
            <button
              onClick={() => setShowShareModal(false)}
              className="text-sm text-gray-400 hover:text-white transition"
            >
              Close
            </button>
          </div>
        </div>
      </ModalLayout>
    </ModalLayout>
  );
};

export default PdfPreview;
