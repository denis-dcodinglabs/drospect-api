import React from "react";
import { HEAT_PALETTES } from "../utils/temperatureUtils";
import "./HeatMap.css";

const HeatMapControls = ({
  showHeatMap,
  onToggleHeatMap,
  heatMapMode,
  onModeChange,
  selectedPalette,
  onPaletteChange,
  temperatureStats,
}) => {
  return (
    <div
      className={`heat-control-panel-compact transition-all duration-300 ${
        showHeatMap
          ? "bg-gradient-to-r from-gray-800/95 to-gray-900/95 border-blue-500/50 shadow-lg"
          : "bg-gray-800/90 border-gray-700"
      } rounded-lg p-3 border backdrop-blur-sm`}
    >
      {/* Compact single-line header with inline controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              showHeatMap ? "bg-blue-400 animate-pulse" : "bg-gray-500"
            }`}
          ></div>
          <h3 className="text-white font-medium text-sm">🗺️ Heat Zones</h3>

          {/* Stats removed for compact header */}

          {/* Inline palette selector and intensity when visible */}
          {showHeatMap && (
            <div className="flex items-center gap-3 ml-3">
              {/* Always-active Temp Delta indicator */}
              <div
                className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-blue-600/30 text-blue-300 border border-blue-500/50"
                aria-label="Temp Delta active"
              >
                <span>🔥</span>
                <span>Temp Delta</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-xs">Palette:</span>
                {Object.entries(HEAT_PALETTES)
                  .filter(([key]) => key === "thermal")
                  .map(([key, palette]) => (
                    <button
                      key={key}
                      onClick={() => onPaletteChange(key)}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-all ${
                        selectedPalette === key
                          ? "bg-blue-600/30 text-blue-300 border border-blue-500/50"
                          : "bg-gray-700/50 text-gray-300 hover:bg-gray-600/50"
                      }`}
                    >
                      <div
                        className="w-4 h-3 rounded border border-gray-500/50"
                        style={{
                          background: `linear-gradient(to right, ${Object.values(
                            palette.gradient,
                          )
                            .slice(0, 3)
                            .join(", ")})`,
                        }}
                      />
                      <span>{palette.name}</span>
                    </button>
                  ))}
              </div>

              {/* Intensity indicator removed for compact layout */}
            </div>
          )}
        </div>

        {/* Compact toggle */}
        <label className="heat-toggle-small">
          <input
            type="checkbox"
            checked={showHeatMap}
            onChange={(e) => onToggleHeatMap(e.target.checked)}
          />
          <span className="heat-toggle-slider-small"></span>
        </label>
      </div>
    </div>
  );
};

export default HeatMapControls;
