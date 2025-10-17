import React, { useEffect, useState } from "react";

const ProcessingStatusModal = ({
  isOpen,
  onClose,
  taskStatus,
  onCancel,
  onViewResult,
}) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (taskStatus) {
      console.log("Modal received taskStatus:", taskStatus); // Debug log
      setProgress(taskStatus.progress || 0);
    }
  }, [taskStatus]);

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
      case "queued":
      case "zipping":
        return "text-yellow-600 bg-yellow-100";
      case "processing":
        return "text-blue-600 bg-blue-100";
      case "completed":
        return "text-green-600 bg-green-100";
      case "failed":
      case "cancelled":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending":
      case "queued":
      case "zipping":
        return (
          <svg
            className="w-5 h-5 animate-pulse"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
              clipRule="evenodd"
            />
          </svg>
        );
      case "processing":
        return (
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-current border-t-transparent"></div>
        );
      case "completed":
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        );
      case "failed":
      case "cancelled":
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  const getStatusText = (status) => {
    if (status === "zipping") return "Preparing data";
    if (status === "pending") return "Preparing";
    return status;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const canCancel =
    taskStatus &&
    ["pending", "queued", "processing"].includes(taskStatus.status);
  const canViewResult = taskStatus && taskStatus.status === "completed";

  if (!isOpen || !taskStatus) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 border-2 border-purple-200">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-purple-800">
            Processing Status
          </h2>
          <button
            onClick={onClose}
            className="text-purple-400 hover:text-purple-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Status */}
        <div className="mb-6">
          <div
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
              taskStatus.status,
            )}`}
          >
            {getStatusIcon(taskStatus.status)}
            <span className="capitalize">
              {getStatusText(taskStatus.status)}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        {(taskStatus.status === "processing" ||
          taskStatus.status === "queued" ||
          taskStatus.status === "pending" ||
          taskStatus.status === "zipping") && (
          <div className="mb-6">
            <div className="flex justify-between text-sm text-purple-600 mb-2">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-purple-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-300 ${
                  taskStatus.status === "processing"
                    ? "bg-gradient-to-r from-purple-500 to-purple-600"
                    : "bg-gradient-to-r from-yellow-400 to-yellow-500"
                }`}
                style={{ width: `${Math.max(progress, 5)}%` }} // Show at least 5% for visual feedback
              ></div>
            </div>
            {taskStatus.status === "queued" && (
              <p className="text-xs text-purple-500 mt-1">
                Task is queued and will start processing soon...
              </p>
            )}
            {taskStatus.status === "pending" && (
              <p className="text-xs text-purple-500 mt-1">
                Preparing data for processing...
              </p>
            )}
            {taskStatus.status === "zipping" && (
              <p className="text-xs text-purple-500 mt-1">
                Preparing data for processing...
              </p>
            )}
          </div>
        )}

        {/* Task Details */}
        <div className="space-y-3 mb-6 bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="flex justify-between">
            <span className="text-purple-700 font-medium">Task ID:</span>
            <span className="font-mono text-sm text-purple-800">
              {taskStatus.id || taskStatus.taskUuid || "Loading..."}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-purple-700 font-medium">Images Count:</span>
            <span className="text-purple-800 font-semibold">
              {taskStatus.imagesCount || "Loading..."}
            </span>
          </div>
          {taskStatus.model && (
            <div className="flex justify-between">
              <span className="text-purple-700 font-medium">Model Type:</span>
              <span className="text-purple-800 font-medium">
                {taskStatus.model === "LOW" &&
                  "Ground Panels - Low Altitude (15-20m)"}
                {taskStatus.model === "HIGH" &&
                  "Ground Panels - High Altitude (35-45m)"}
                {taskStatus.model === "ROOF" && "Roof Top Panels (20-30m)"}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-purple-700 font-medium">Started:</span>
            <span className="text-sm text-purple-800">
              {taskStatus.createdAt
                ? formatDate(taskStatus.createdAt)
                : "Loading..."}
            </span>
          </div>
          {taskStatus.updatedAt &&
            taskStatus.updatedAt !== taskStatus.createdAt && (
              <div className="flex justify-between">
                <span className="text-purple-700 font-medium">
                  Last Updated:
                </span>
                <span className="text-sm text-purple-800">
                  {formatDate(taskStatus.updatedAt)}
                </span>
              </div>
            )}
          {taskStatus.nodeOdmTaskId && (
            <div className="flex justify-between">
              <span className="text-purple-700 font-medium">NodeODM Task:</span>
              <span className="font-mono text-xs text-purple-800">
                {taskStatus.nodeOdmTaskId}
              </span>
            </div>
          )}
        </div>

        {/* Error Message */}
        {(taskStatus.errorMessage || taskStatus.status === "failed") && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">
              <span className="font-semibold">Error:</span>{" "}
              {taskStatus.errorMessage || "Task processing failed"}
            </p>
            {taskStatus.status === "failed" && !taskStatus.errorMessage && (
              <p className="text-red-600 text-xs mt-2">
                The task failed during processing. This could be due to invalid
                images, server issues, or processing timeout.
              </p>
            )}
          </div>
        )}

        {/* Success Message */}
        {taskStatus.status === "completed" && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 text-sm">
              <span className="font-semibold">Success!</span> Ortho + AI
              processing completed successfully. Your orthomosaic image with AI
              analysis is ready.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          {canCancel && (
            <button
              onClick={() => onCancel(taskStatus.id)}
              className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
            >
              Cancel Processing
            </button>
          )}
          {taskStatus.status === "failed" && (
            <button
              onClick={() => {
                onClose();
                // Trigger a new upload - this would need to be passed as a prop
                if (
                  window.confirm(
                    "Would you like to start a new Ortho + AI processing task with the same images?",
                  )
                ) {
                  // This would need to be implemented to restart the process
                  console.log("Retry functionality would be implemented here");
                }
              }}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              Start New Task
            </button>
          )}
          {canViewResult && (
            <button
              onClick={() => onViewResult(taskStatus)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              {taskStatus.resultUrl
                ? "View Orthomosaic"
                : "Process Orthomosaic"}
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProcessingStatusModal;
