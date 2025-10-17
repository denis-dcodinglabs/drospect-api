import React from "react";

const ProjectPanelStats = ({ panelStatistics }) => {
  // Don't render if no statistics or no panels inspected
  if (!panelStatistics || panelStatistics.inspectedPanels === 0) {
    return null;
  }

  const {
    healthyPanels,
    unhealthyPanels,
    totalImages,
    processing,
    inspectedPanels,
  } = panelStatistics;

  // Don't render if no healthy or unhealthy panels
  if (healthyPanels === 0 && unhealthyPanels === 0) {
    return null;
  }

  // Calculate percentages
  const unhealthyPercentage =
    inspectedPanels > 0
      ? Math.round((unhealthyPanels / inspectedPanels) * 100)
      : 0;
  const healthyPercentage =
    inspectedPanels > 0
      ? Math.round((healthyPanels / inspectedPanels) * 100)
      : 0;

  return (
    <div className="absolute top-2 left-2 z-10 group">
      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md backdrop-blur-sm border border-white/10 cursor-default transition-all duration-200 group-hover:border-blue-400/30 group-hover:bg-black/20">
        {/* Health status icon */}
        <svg
          className="w-4 h-4 text-green-400 flex-shrink-0 group-hover:text-green-300 transition-colors duration-200"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-4.121-4.121a1 1 0 011.414-1.414L8.414 12.172l6.879-6.879a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>

        {/* Numbers in horizontal format */}
        <div className="flex items-center gap-1">
          {/* Unhealthy count */}
          {unhealthyPanels > 0 && (
            <span className="text-red-400 font-semibold text-xs">
              {unhealthyPanels}
            </span>
          )}

          {/* Pipe separator */}
          {unhealthyPanels > 0 && healthyPanels > 0 && (
            <span className="text-white/50 font-medium text-xs">|</span>
          )}

          {/* Healthy count */}
          {healthyPanels > 0 && (
            <span className="text-green-400 font-semibold text-xs">
              {healthyPanels}
            </span>
          )}
        </div>
      </div>

      {/* Hover Tooltip - Smart positioning */}
      <div className="absolute left-0 bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-50">
        <div className="bg-gray-900/95 backdrop-blur-sm text-white p-3 rounded-lg shadow-xl border border-gray-700/50 text-xs whitespace-nowrap min-w-[180px]">
          {/* Detailed stats */}
          <div className="space-y-1.5">
            {/* Issues found */}
            {unhealthyPanels > 0 && (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-400"></div>
                  <span className="text-red-300">Unhealthy Panels:</span>
                </div>
                <span className="font-semibold text-red-300 text-left">
                  {unhealthyPanels} ({unhealthyPercentage}%)
                </span>
              </div>
            )}

            {/* Healthy panels */}
            {healthyPanels > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400"></div>
                  <span className="text-green-300">Healthy Panels:</span>
                </div>
                <span className="font-semibold text-green-300 text-left">
                  {healthyPanels} ({healthyPercentage}%)
                </span>
              </div>
            )}

            {/* Processing status */}
            {processing > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse"></div>
                  <span className="text-orange-300">Processing:</span>
                </div>
                <span className="font-semibold text-orange-300">
                  {processing}
                </span>
              </div>
            )}

            {/* Totals */}
            <div className="border-t border-gray-600/50 pt-1.5 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Inspected:</span>
                <span className="font-semibold text-white">
                  {inspectedPanels} / {totalImages}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tooltip arrow - pointing down since tooltip is above */}
        <div className="absolute -bottom-1 left-4 w-2 h-2 bg-gray-900/95 border-r border-b border-gray-700/50 transform rotate-45"></div>
      </div>
    </div>
  );
};

export default ProjectPanelStats;
