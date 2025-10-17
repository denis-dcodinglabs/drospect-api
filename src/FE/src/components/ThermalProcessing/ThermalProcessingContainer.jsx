import React, { useState, useEffect, useRef } from "react";
import ThermalModelSelectionModal from "./ThermalModelSelectionModal";
import ProcessingStatusModal from "./ProcessingStatusModal";
import EnhancedResultViewer from "./EnhancedResultViewer";
import axiosInstance from "../../axiosInstance";
import { useSelector } from "react-redux";

const ThermalProcessingContainer = ({
  projectId,
  project,
  onProcessingStateChange,
  showModelSelection = false,
  onModelSelectionClose,
  onTasksLoaded = () => {},
  onTaskCountChange = () => {}, // Add new prop for task count
}) => {
  const [showModelSelectionModal, setShowModelSelectionModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showResultViewer, setShowResultViewer] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTask, setCurrentTask] = useState(null);
  const [projectTasks, setProjectTasks] = useState([]);
  const [selectedResult, setSelectedResult] = useState(null);
  const [thermalImageCount, setThermalImageCount] = useState(0);
  const pollingIntervalRef = useRef(null);
  const [startLoadingText, setStartLoadingText] = useState(null);

  // Get credits from Redux store
  const credits = useSelector(
    (state) => state.userReducer.wallet?.credits || 0,
  );

  // Load existing thermal tasks for the project and get thermal image count
  useEffect(() => {
    if (projectId) {
      loadProjectTasks();
      loadThermalImageCount();
    }

    // Request notification permission for completion alerts
    if (window.Notification && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, [projectId]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, []);

  // Update processing state when tasks change
  useEffect(() => {
    if (onProcessingStateChange) {
      const isProcessingDisabled = hasActiveTask();
      onProcessingStateChange(isProcessingDisabled);
    }
    // Also notify parent whenever task list changes
    onTasksLoaded(projectTasks.length > 0);
    // Notify parent of task count change
    onTaskCountChange(projectTasks.length);
  }, [projectTasks, onProcessingStateChange, onTasksLoaded, onTaskCountChange]);

  // Remove useImperativeHandle - use props instead
  useEffect(() => {
    if (showModelSelection) {
      loadThermalImageCount();
      setShowModelSelectionModal(true);
    }
  }, [showModelSelection]);

  const loadProjectTasks = async () => {
    try {
      const response = await axiosInstance.getData(
        `/orthomosaic-processing/${projectId}/project`,
      );
      if (response.error) {
        console.error("Failed to load project thermal tasks:", response.error);
        return;
      }
      const tasks = response.data || response;
      setProjectTasks(tasks);
      // Inform parent about task availability
      onTasksLoaded(tasks.length > 0);
      // Inform parent about task count
      onTaskCountChange(tasks.length);
    } catch (error) {
      console.error("Failed to load project thermal tasks:", error);
    }
  };

  const loadThermalImageCount = async () => {
    try {
      const response = await axiosInstance.getData(
        `/projects/images/${projectId}?page=1&limit=9999&isRgb=false`,
      );
      if (response.error) {
        console.error("Failed to load thermal image count:", response.error);
        return;
      }
      setThermalImageCount(response.data?.images?.length || 0);
    } catch (error) {
      console.error("Failed to load thermal image count:", error);
    }
  };

  // Helper function to update both current task and project tasks list
  const updateTaskStatus = (taskId, statusUpdate) => {
    console.log(`Updating task ${taskId} status:`, statusUpdate);

    // Update current task if it matches
    setCurrentTask((prev) => {
      if (prev && prev.id === taskId) {
        const updated = { ...prev, ...statusUpdate };
        console.log(`Current task updated:`, updated);
        return updated;
      }
      return prev;
    });

    // Update project tasks list
    setProjectTasks((prevTasks) => {
      const updatedTasks = prevTasks.map((task) =>
        task.id === taskId ? { ...task, ...statusUpdate } : task,
      );
      console.log(
        `Project tasks updated. Task ${taskId} now has status:`,
        updatedTasks.find((t) => t.id === taskId)?.status,
      );
      return updatedTasks;
    });
  };

  const markTaskAsFailedInDatabase = async (taskId, failureUpdate) => {
    try {
      console.log(
        `Persisting failure status to database for task ${taskId}...`,
      );

      // Update local state first
      updateTaskStatus(taskId, failureUpdate);

      // Update database via backend API
      const response = await axiosInstance.postData(
        `/orthomosaic-processing/${taskId}/fail`,
        {
          errorMessage: failureUpdate.errorMessage,
          status: "failed",
        },
      );

      if (response.error) {
        console.error("Failed to persist failure status:", response.error);
        // Don't throw error - local state is already updated
      } else {
        console.log("Failure status persisted to database successfully");
      }
    } catch (error) {
      console.error("Error persisting failure status:", error);
      // Don't throw error - local state is already updated
    }
  };

  const handleModelSelectionStart = () => {
    setShowModelSelectionModal(true);
  };

  const handleModelSelection = async (selectedModel, projectId) => {
    setIsProcessing(true);
    try {
      console.log(
        process.env.REACT_APP_BASEURL + "/webhook/orthomosaic",
        " nedim",
      );
      const startCall = async () =>
        await axiosInstance.postData(
          `/orthomosaic-processing/${projectId}/start`,
          {
            model: selectedModel,
            options: {
              "orthophoto-png": true,
              gltf: true,
              "auto-boundary": true,
              dsm: true,
              "pc-quality": "high",
              "dem-resolution": 2.0,
              "orthophoto-resolution": 2.0,
              webhook: process.env.REACT_APP_BASEURL + "webhook/orthomosaic",
            },
          },
        );

      const response = await startCall();

      if (response.error) {
        throw new Error(
          response.error.message || "Failed to start thermal processing",
        );
      }

      const newTask = response.data || response;
      console.log("New task created:", newTask); // Debug log

      // Ensure task has all required fields
      const completeTask = {
        ...newTask,
        imagesCount: thermalImageCount,
        progress: 0,
        status: newTask.status || "queued",
      };

      setCurrentTask(completeTask);
      setShowModelSelectionModal(false);
      setShowStatusModal(true);

      // Start polling for status updates immediately
      startPolling(completeTask.id);

      // Reload project tasks
      await loadProjectTasks();
    } catch (error) {
      console.error("Failed to start thermal processing:", error);
      // Keep UX gentle: inform to try again later instead of hard error
      // alert(error.message || "Failed to start thermal processing");
    } finally {
      setIsProcessing(false);
      setStartLoadingText(null);
    }
  };

  const startPolling = (taskId) => {
    // Clear any existing polling
    if (pollingIntervalRef.current) {
      clearTimeout(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    console.log(`Starting polling for task ${taskId} every 20 seconds...`);
    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 5; // Stop polling after 5 consecutive errors
    let nextPollDelay = 20000; // Start with 20 seconds

    const scheduleNextPoll = (delay) => {
      pollingIntervalRef.current = setTimeout(async () => {
        try {
          const response = await axiosInstance.getData(
            `/orthomosaic-processing/${taskId}/status`,
          );

          // Handle different types of errors
          if (response.error) {
            console.error("API Error:", response.error);
            consecutiveErrors++;

            // Check if it's a "not found" error or server error
            if (
              response.error.message?.includes("not found") ||
              response.error.message?.includes("Task") ||
              response.status === 404
            ) {
              console.log("Task not found, marking as failed...");
              const failureUpdate = {
                status: "failed",
                errorMessage:
                  "Task not found in backend - may have been deleted or expired",
                updatedAt: new Date().toISOString(),
              };
              await markTaskAsFailedInDatabase(taskId, failureUpdate);
              if (pollingIntervalRef.current) {
                clearTimeout(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
              }
              return;
            }

            // Stop polling if too many consecutive errors
            if (consecutiveErrors >= maxConsecutiveErrors) {
              console.log(
                `Too many consecutive errors (${consecutiveErrors}), stopping polling and marking task as failed...`,
              );
              const failureUpdate = {
                status: "failed",
                errorMessage: `Task monitoring failed after ${consecutiveErrors} consecutive errors. Task may still be processing on server.`,
                updatedAt: new Date().toISOString(),
              };
              await markTaskAsFailedInDatabase(taskId, failureUpdate);
              if (pollingIntervalRef.current) {
                clearTimeout(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
              }
              return;
            }

            // For API errors, just wait and retry - don't mark as failed
            // The task might still be processing fine on NodeODM
            console.log(
              `API error ${consecutiveErrors}/${maxConsecutiveErrors} (NodeODM may be temporarily down), will retry in 40 seconds...`,
            );
            nextPollDelay = 40000; // Wait 40 seconds after error
            scheduleNextPoll(nextPollDelay);
            return;
          }

          // Reset error counter and delay on successful response
          consecutiveErrors = 0;
          nextPollDelay = 20000; // Reset to normal 20-second interval

          const updatedTask = response.data || response;
          console.log("Polling update:", updatedTask); // Debug log

          // Validate the response structure
          if (!updatedTask || !updatedTask.id) {
            console.error("Invalid task response:", updatedTask);
            consecutiveErrors++;
            return;
          }

          // Check if NodeODM reports the task as failed (status 50)
          if (updatedTask.status === "failed") {
            console.log(
              "NodeODM reports task as failed, marking as failed in database...",
            );
            const failureUpdate = {
              status: "failed",
              errorMessage:
                updatedTask.errorMessage || "Task failed on NodeODM server",
              updatedAt: new Date().toISOString(),
            };
            await markTaskAsFailedInDatabase(taskId, failureUpdate);
            if (pollingIntervalRef.current) {
              clearTimeout(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            return;
          }

          // Update both current task and project tasks list
          updateTaskStatus(taskId, updatedTask);

          // Handle completion - automatically fetch result
          if (updatedTask.status === "completed") {
            console.log("Task completed, stopping polling...");
            if (pollingIntervalRef.current) {
              clearTimeout(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }

            // Auto-fetch the result when completed
            try {
              console.log("Task completed, fetching result...");
              const resultResponse = await axiosInstance.getData(
                `/orthomosaic-processing/${taskId}/result`,
              );

              if (resultResponse.error) {
                console.error("Failed to fetch result:", resultResponse.error);
              } else {
                const result = resultResponse.data || resultResponse;
                if (result.success && result.resultUrl) {
                  // Update the task with the result URL
                  const resultUpdate = {
                    resultUrl: result.resultUrl,
                    orthomosaicUrl: result.resultUrl,
                  };
                  updateTaskStatus(taskId, resultUpdate);
                  console.log("Result fetched successfully:", result.resultUrl);

                  // Show notification that result is ready
                  if (
                    window.Notification &&
                    Notification.permission === "granted"
                  ) {
                    new Notification("Thermal Processing Complete", {
                      body: "Your orthomosaic image is ready to view!",
                      icon: "/favicon.ico",
                    });
                  }
                } else {
                  console.log("Task completed but no result URL available yet");
                }
              }
            } catch (resultError) {
              console.error("Failed to auto-fetch result:", resultError);
            }

            // Task completed, polling already stopped above
          }
          // Stop polling if task failed or cancelled
          else if (["failed", "cancelled"].includes(updatedTask.status)) {
            console.log(`Task ${updatedTask.status}, stopping polling...`);
            if (pollingIntervalRef.current) {
              clearTimeout(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            // No need to reload - status already updated via updateTaskStatus
          } else {
            // Continue polling for other statuses
            scheduleNextPoll(nextPollDelay);
          }
        } catch (error) {
          console.error("Network error (will retry):", error);
          consecutiveErrors++;

          // Stop polling if too many consecutive errors
          if (consecutiveErrors >= maxConsecutiveErrors) {
            const failureUpdate = {
              status: "failed",
              errorMessage: `Task monitoring failed after ${consecutiveErrors} consecutive network errors. Task may still be processing on server.`,
              updatedAt: new Date().toISOString(),
            };
            await markTaskAsFailedInDatabase(taskId, failureUpdate);
            if (pollingIntervalRef.current) {
              clearTimeout(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            return;
          }

          // Handle network errors, timeouts, etc. - just retry, don't mark as failed
          console.log(
            `Network error ${consecutiveErrors}/${maxConsecutiveErrors} (server may be temporarily down), will retry in 40 seconds...`,
          );
          nextPollDelay = 40000; // Wait 40 seconds after network error
          scheduleNextPoll(nextPollDelay);
        }
      }, delay);
    };

    // Start the first poll immediately
    scheduleNextPoll(0);
    console.log("Polling started successfully");
  };

  const handleCancelTask = async (taskId) => {
    try {
      const response = await axiosInstance.postData(
        `/orthomosaic-processing/${taskId}/cancel`,
        {},
      );
      if (response.error) {
        throw new Error(response.error.message || "Failed to cancel task");
      }

      // Update task status to cancelled
      updateTaskStatus(taskId, {
        status: "cancelled",
        updatedAt: new Date().toISOString(),
      });

      // Stop polling
      if (pollingIntervalRef.current) {
        clearTimeout(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    } catch (error) {
      console.error("Failed to cancel task:", error);
      alert("Failed to cancel task. Please try again.");
    }
  };

  const handleViewResult = async (taskStatus) => {
    try {
      console.log("Fetching result for task:", taskStatus.id);

      // Show loading state
      setSelectedResult({
        ...taskStatus,
        isLoading: true,
        loadingMessage: "Preparing orthomosaic image...",
      });
      setShowResultViewer(true);
      setShowStatusModal(false);

      // Get the result URL from the backend (this will trigger ZIP processing if needed)
      const response = await axiosInstance.getData(
        `/orthomosaic-processing/${taskStatus.id}/result`,
      );

      if (response.error) {
        throw new Error(response.error.message || "Failed to get result");
      }

      const result = response.data || response;
      console.log("Result response:", result);

      if (result.success && result.resultUrl) {
        // Update with the actual result URL
        setSelectedResult({
          ...taskStatus,
          resultUrl: result.resultUrl,
          isLoading: false,
          loadingMessage: null,
        });

        // Also update the task in the project tasks list with the result URL
        updateTaskStatus(taskStatus.id, {
          resultUrl: result.resultUrl,
          orthomosaicUrl: result.resultUrl,
        });

        console.log("Orthomosaic image ready:", result.resultUrl);
      } else {
        throw new Error("No result URL received from server");
      }
    } catch (error) {
      console.error("Failed to get result:", error);

      // Update with error state
      setSelectedResult({
        ...taskStatus,
        isLoading: false,
        loadingMessage: null,
        error: error.message || "Failed to load orthomosaic image",
      });

      // Show error alert as fallback
      alert(
        `Failed to load result: ${
          error.message || "Unknown error"
        }. Please try again.`,
      );
    }
  };

  const handleStatusModalClose = () => {
    setShowStatusModal(false);
    setCurrentTask(null);
    if (pollingIntervalRef.current) {
      clearTimeout(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const getLatestTask = () => {
    if (projectTasks.length === 0) return null;
    return projectTasks.reduce((latest, task) =>
      new Date(task.createdAt) > new Date(latest.createdAt) ? task : latest,
    );
  };

  const hasActiveTask = () => {
    return projectTasks.some((task) =>
      ["pending", "queued", "processing"].includes(task.status),
    );
  };

  const latestTask = getLatestTask();
  const isProcessingDisabled = hasActiveTask();

  // Do NOT hide the entire component when there are no tasks.
  // We still want to allow opening the model selection modal to start the first task.

  const handleModelSelectionModalClose = () => {
    setShowModelSelectionModal(false);
    if (onModelSelectionClose) {
      onModelSelectionClose();
    }
  };

  return (
    <div className="thermal-processing-container">
      {/* Status Message */}
      {isProcessingDisabled && (
        <div className="mb-4 p-3 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-4 h-4 bg-yellow-500 rounded-full">
              <svg
                className="w-2 h-2 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </div>
            <p className="text-gray-300 text-sm">
              Ortho + AI processing is currently running for this project
            </p>
          </div>
        </div>
      )}

      {/* Ortho + AI Processing History */}
      {projectTasks.length > 0 && (
        <div className="">
          <div className="space-y-2 max-h-56 overflow-y-auto thermal-scrollbar pb-2">
            {projectTasks.map((task, index) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-700 to-gray-650 rounded-lg border border-gray-600 hover:from-gray-650 hover:to-gray-600 transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        task.status === "completed"
                          ? "bg-green-500"
                          : task.status === "processing"
                          ? "bg-blue-500 animate-pulse"
                          : task.status === "failed"
                          ? "bg-red-500"
                          : "bg-yellow-500"
                      }`}
                    ></div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-200 text-sm">
                        {task.imagesCount} images
                      </p>
                      {task.model && (
                        <span className="text-xs text-gray-300 bg-gradient-to-r from-gray-650 to-gray-600 px-1.5 py-0.5 rounded">
                          {task.model}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(task.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      •{" "}
                      <span className="capitalize font-medium">
                        {task.status}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {["pending", "queued", "processing", "zipping"].includes(
                    task.status,
                  ) && (
                    <button
                      onClick={() => {
                        setCurrentTask(task);
                        setShowStatusModal(true);
                        // Always start polling for active tasks
                        if (
                          [
                            "pending",
                            "queued",
                            "processing",
                            "zipping",
                          ].includes(task.status)
                        ) {
                          startPolling(task.id);
                        }
                      }}
                      className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-md transition-colors duration-200"
                    >
                      View Status
                    </button>
                  )}
                  {task.status === "completed" && (
                    <button
                      onClick={() => handleViewResult(task)}
                      className="px-3 py-1.5 text-xs font-medium text-gray-200 bg-gradient-to-r from-gray-600 to-gray-500 hover:from-gray-500 hover:to-gray-400 rounded-md transition-all duration-200 border border-gray-500"
                    >
                      {task.resultUrl ? "View Result" : "Process Result"}
                    </button>
                  )}
                  {task.status === "failed" && (
                    <span className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 rounded-md">
                      Failed
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <ThermalModelSelectionModal
        isOpen={showModelSelectionModal}
        onClose={handleModelSelectionModalClose}
        onSelectModel={handleModelSelection}
        projectId={projectId}
        isLoading={isProcessing}
        credits={credits}
        thermalImageCount={thermalImageCount}
        loadingText={startLoadingText}
      />

      <ProcessingStatusModal
        isOpen={showStatusModal}
        onClose={handleStatusModalClose}
        taskStatus={currentTask}
        onCancel={handleCancelTask}
        onViewResult={handleViewResult}
      />

      <EnhancedResultViewer
        isOpen={showResultViewer}
        onClose={() => {
          setShowResultViewer(false);
          setSelectedResult(null);
        }}
        resultUrl={selectedResult?.resultUrl}
        taskStatus={selectedResult}
      />
    </div>
  );
};

export default ThermalProcessingContainer;
