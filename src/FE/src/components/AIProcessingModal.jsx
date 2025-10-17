import React, { useState, useMemo } from "react";
import ModalLayout from "./ModalLayout";
import Button from "./formComponents/Button";
import { FaCheckCircle, FaExclamationCircle } from "react-icons/fa";

const MAIN_OPTIONS = [
  { label: "RGB Images", value: "RGB" },
  { label: "Thermal Images", value: "THERMAL" },
];

const RGB_SUB_OPTIONS = [
  { label: "Low Altitude Flight (15-20m)", value: "LOW" },
];

const THERMAL_SUB_OPTIONS = [
  { label: "Ground Panels - Low Altitude Flight (15-20m)", value: "LOW" },
  { label: "Ground Panels - High Altitude Flight (35-45m)", value: "HIGH" },
  { label: "Roof Top Panels (20-30m above target)", value: "ROOF" },
];

// Extracted OptionRadio for clarity
const OptionRadio = ({ name, option, checked, onChange }) => (
  <label
    className={`flex items-center gap-3 px-4 py-4 rounded-xl cursor-pointer border-2 transition-all duration-150 text-lg font-medium shadow-sm ${
      checked
        ? "border-orange-400 bg-orange-900/20 text-orange-200"
        : "border-gray-700 bg-[#231a3a] text-gray-200 hover:border-orange-400 hover:bg-orange-900/10"
    }`}
  >
    <input
      type="radio"
      name={name}
      value={option.value}
      checked={checked}
      onChange={onChange}
      className="w-5 h-5 accent-orange-500"
    />
    <span>{option.label}</span>
  </label>
);

const getSubOptions = (mainOption) => {
  if (mainOption === "RGB") return RGB_SUB_OPTIONS;
  if (mainOption === "THERMAL") return THERMAL_SUB_OPTIONS;
  return [];
};

const AIProcessingModal = ({
  open,
  onClose,
  onSubmitRGB,
  onSubmitThermal,
  onSubmitBoth,
  loading,
  credits = 0,
  statistics = {},
  selectedImages = [],
}) => {
  const [step, setStep] = useState(1);
  const [mainOption, setMainOption] = useState(null);
  const [subOption, setSubOption] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Reset modal state
  const resetModal = () => {
    setStep(1);
    setMainOption(null);
    setSubOption(null);
  };

  // Local onClose handler to always reset
  const handleModalClose = () => {
    resetModal();
    onClose();
  };

  // Use selectedImages if any, otherwise statistics.processing
  const imageCount =
    selectedImages.length > 0
      ? selectedImages.length
      : statistics?.processing || 0;

  // --- Cost Calculation Logic ---
  const { cost, status, statusColor, statusIcon, costText, disableSubmit } =
    useMemo(() => {
      if (!mainOption || !subOption)
        return {
          cost: 0,
          status: "",
          statusColor: "",
          statusIcon: null,
          costText: "",
          disableSubmit: true,
        };
      let cost = 0;
      let costText = "";
      let disableSubmit = false;
      // RGB: High Altitude only
      if (mainOption === "RGB" && subOption === "LOW") {
        cost = imageCount * 1;
        costText = `Processing ${imageCount} image${
          imageCount === 1 ? "" : "s"
        } with RGB (Low Altitude)`;
        disableSubmit = cost > credits || imageCount === 0;
      }
      // Thermal
      else if (mainOption === "THERMAL") {
        if (subOption === "LOW" || subOption === "ROOF") {
          cost = imageCount * 2;
          costText = `Processing ${imageCount} image${
            imageCount === 1 ? "" : "s"
          } with Thermal (${
            subOption === "LOW" ? "Low Altitude" : "Roof Top"
          })`;
          disableSubmit = cost > credits || imageCount === 0;
        } else if (subOption === "HIGH") {
          cost = imageCount * 1;
          costText = `Processing ${imageCount} image${
            imageCount === 1 ? "" : "s"
          } with Thermal (High Altitude)`;
          disableSubmit = cost > credits || imageCount === 0;
        }
      }
      // Both
      else if (mainOption === "BOTH") {
        if (subOption === "HIGH") {
          cost = imageCount * 2; // One for RGB, one for Thermal
          costText = `Processing ${imageCount} image${
            imageCount === 1 ? "" : "s"
          } with Both (High Altitude): RGB + Thermal`;
          disableSubmit = cost > credits || imageCount === 0;
        } else if (subOption === "LOW") {
          cost = imageCount * 2;
          costText = `Processing ${imageCount} image${
            imageCount === 1 ? "" : "s"
          } with Both (Low Altitude): RGB + Thermal`;
          disableSubmit = cost > credits || imageCount === 0;
        }
      }
      let status = "Sufficient Credits";
      let statusColor = "text-green-500";
      let statusIcon = <FaCheckCircle className="inline mr-1" />;
      if (cost > credits) {
        status = "Insufficient Credits";
        statusColor = "text-red-500";
        statusIcon = <FaExclamationCircle className="inline mr-1" />;
        disableSubmit = true;
      }
      if (imageCount === 0) {
        status = "No images to process";
        statusColor = "text-yellow-400";
        statusIcon = <FaExclamationCircle className="inline mr-1" />;
        disableSubmit = true;
      }
      if (mainOption === "BOTH" && subOption === "LOW") {
        status = cost > credits ? "Insufficient Credits" : "Sufficient Credits";
        statusColor = cost > credits ? "text-red-500" : "text-green-500";
        statusIcon =
          cost > credits ? (
            <FaExclamationCircle className="inline mr-1" />
          ) : (
            <FaCheckCircle className="inline mr-1" />
          );
        // disableSubmit already set above
      }
      return { cost, status, statusColor, statusIcon, costText, disableSubmit };
    }, [mainOption, subOption, imageCount, credits]);

  const handleMainSelect = (value) => {
    setMainOption(value);
    setSubOption(null);
  };

  const handleSubSelect = (value) => {
    setSubOption(value);
  };

  const handleNext = () => {
    setStep(2);
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setSubOption(null);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    if (mainOption === "RGB" && subOption === "LOW") {
      await onSubmitRGB();
    } else if (mainOption === "THERMAL") {
      await onSubmitThermal(subOption);
    } else if (mainOption === "BOTH") {
      if (subOption === "HIGH") {
        await onSubmitBoth("HIGH");
      } else if (subOption === "LOW") {
        await onSubmitBoth("LOW");
      }
    }
    setSubmitting(false);
    resetModal();
    onClose();
  };

  // Memoize subOptions
  const subOptions = useMemo(() => getSubOptions(mainOption), [mainOption]);

  return (
    <ModalLayout
      open={open}
      handleClose={handleModalClose}
      className="w-[370px] md:w-[540px] bg-gradient-to-br from-[#2e2154] to-[#1a1333] border border-purple-700 shadow-2xl"
    >
      <div className="flex flex-col items-center w-full">
        <h1 className="text-3xl font-bold mb-6 text-center tracking-tight">
          Start AI Processing
        </h1>
        {step === 1 && (
          <>
            <div className="flex flex-col gap-4 w-full">
              {MAIN_OPTIONS.map((opt) => (
                <OptionRadio
                  key={opt.value}
                  name="mainOption"
                  option={opt}
                  checked={mainOption === opt.value}
                  onChange={() => handleMainSelect(opt.value)}
                />
              ))}
            </div>
            <Button
              text="Next"
              className="mt-8 w-full rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white font-semibold text-lg shadow-lg hover:from-orange-600 hover:to-pink-600"
              disabled={!mainOption}
              onClick={handleNext}
            />
          </>
        )}
        {step === 2 && (
          <>
            <div className="flex flex-col gap-4 w-full mb-2">
              {subOptions.map((opt) => (
                <React.Fragment key={opt.value}>
                  <OptionRadio
                    name="subOption"
                    option={opt}
                    checked={subOption === opt.value}
                    onChange={() => handleSubSelect(opt.value)}
                  />
                  {subOption === opt.value && (
                    <div className="w-full rounded-xl bg-[#1e1830] border border-purple-700 p-4 mb-3 mt-2 flex flex-col items-center shadow-inner">
                      <div className="text-base font-semibold mb-1 text-purple-200">
                        Summary
                      </div>
                      <div className="text-sm text-gray-300 mb-1">
                        {costText}
                      </div>
                      <div
                        className={`text-base font-semibold flex items-center gap-2 ${statusColor}`}
                      >
                        {statusIcon}
                        {status}
                      </div>
                      <div className="text-sm text-gray-400 mt-1">
                        You have{" "}
                        <span className="font-bold text-white">{credits}</span>{" "}
                        credits. This will cost{" "}
                        <span className="font-bold text-orange-300">
                          {cost}
                        </span>{" "}
                        credits.
                      </div>
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
            <div className="flex gap-4 w-full mt-4">
              <Button
                text="Back"
                className="w-1/2 rounded-xl bg-gray-700 text-white font-semibold text-lg shadow-md hover:bg-gray-600"
                onClick={handleBack}
              />
              <Button
                text="Submit"
                className={`w-1/2 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white font-semibold text-lg shadow-lg hover:from-orange-600 hover:to-pink-600 ${
                  disableSubmit ? "opacity-60 cursor-not-allowed" : ""
                }`}
                disabled={!subOption || submitting || disableSubmit}
                onClick={handleSubmit}
              />
            </div>
            {/* If Both/Low Altitude, show a note that logic is commented out */}
          </>
        )}
      </div>
    </ModalLayout>
  );
};

export default AIProcessingModal;
