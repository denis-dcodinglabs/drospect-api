import React from "react";

export default function DeltaFilterControl({
  presets,
  activePreset,
  deltaMin,
  deltaMax,
  onPreset,
  onCustom,
  inline = false,
  showLabel = true,
}) {
  const presetOptions = Object.values(presets).map((p) => ({
    value: p.key,
    label: p.label,
  }));

  return (
    <div className={inline ? "flex items-center" : "flex flex-col items-end"}>
      {showLabel && (
        <label
          className={
            inline ? "text-sm text-gray-300 mr-2" : "text-sm text-gray-300 mb-1"
          }
        >
          Delta filter (°C)
        </label>
      )}
      <div className={inline ? "" : "flex items-center gap-2"}>
        <select
          value={activePreset}
          onChange={(e) => {
            const val = e.target.value;
            onPreset(val);
          }}
          className={
            inline
              ? "px-2 py-1 rounded-md text-sm bg-gray-800 text-gray-200 border border-gray-700 focus:outline-none min-w-[120px]"
              : "px-3 py-2 rounded-lg text-sm bg-gray-800 text-gray-200 border border-gray-700 focus:outline-none"
          }
        >
          {presetOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
