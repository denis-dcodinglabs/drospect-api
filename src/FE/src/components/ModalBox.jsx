import React, { useEffect, useState } from "react";
import Textarea from "./formComponents/Textarea";
import Input from "./formComponents/Input";
import Button from "./formComponents/Button";
import ModalLayout from "./ModalLayout";
import FileUpload from "./FileUpload";

const ModalBox = ({
  mode,
  data,
  title,
  buttonTitle,
  formStyle = "flex flex-col gap-3",
  titleStyle,
  open,
  handleClose,
  handleSubmit,
  onSubmit,
  inputs,
  validation,
  imageCounter,
  register,
  watch,
  credits,
  handleFileChange,
  control,
  uploadProgress,
  modalClassName,
  selectedImages = [],
  errors,
  loading,
}) => {
  const [inputData, setInputData] = useState({
    name: "",
    description: "",
    megawatt: "",
    altitude: "",
  });

  useEffect(() => {
    if (mode === "edit" && data) {
      setInputData(data);
    }
  }, [mode, data]);

  const [isButtonDisabled, setIsButtonDisabled] = useState(false);
  const [creditMessage, setCreditMessage] = useState("");
  useEffect(() => {
    const nonRgbImagesCount = selectedImages.filter(
      (image) => !image.rgb,
    ).length;
    const imageCredits =
      selectedImages.length > 0 ? nonRgbImagesCount : imageCounter;
    const value = watch?.altitude || "LOW";
    const cost =
      value === "LOW" || value === "ROOF" ? imageCredits * 2 : imageCredits;
    if ((value === "LOW" || value === "ROOF") && imageCredits > credits / 2) {
      setIsButtonDisabled(true);
      setCreditMessage(
        <div className="text-red-600  ">
          <p className="text-lg">Insufficient Credits</p>
          <br />
          <p>
            You have <span className="font-bold text-lg">{credits}</span>{" "}
            credits, but starting AI processing with{" "}
            <span className=" text-lg">{value} </span> altitude costs{" "}
            <span className="font-semibold underline text-xl">
              {imageCounter * 2}
            </span>{" "}
            credits.
          </p>
          <br />
          <p>Please top up your credits to continue.</p>
        </div>,
      );
    } else if (value === "HIGH" && imageCredits > credits) {
      setIsButtonDisabled(true);
      setCreditMessage(
        <div className="text-red-600">
          <p className="text-lg">Insufficient Credits</p>
          <br />
          <p>
            You have <span className="font-bold text-lg">{credits}</span>{" "}
            credits, but starting AI processing with{" "}
            <span className="text-lg">HIGH</span> altitude costs{" "}
            <span className="underline text-xl">{imageCounter}</span> credits.
          </p>
          <br />
          <p>Please top up your credits to continue.</p>
        </div>,
      );
    } else {
      setIsButtonDisabled(false);
      setCreditMessage(
        <div className="text-green-600 ">
          <p className="text-lg">Sufficient Credits</p>
          <br />
          <p>
            You have <span className="font-bold text-lg">{credits}</span>{" "}
            credits. Starting AI processing with{" "}
            <span className="text-lg">{value}</span> altitude will cost{" "}
            <span className="text-xl underline">{cost}</span> credits.
          </p>
          <br />
          <p>You can proceed with the project!</p>
        </div>,
      );
    }
  }, [watch?.altitude, imageCounter, credits, selectedImages.length]);

  return (
    <ModalLayout
      open={open}
      handleClose={handleClose}
      className={modalClassName}
    >
      <div className="w-full">
        <h1 className={`text-3xl mb-6 text-center ${titleStyle}`}>{title}</h1>
        <form onSubmit={handleSubmit(onSubmit)} className={` ${formStyle}`}>
          {inputs?.map((input, index) => {
            if (input.type === "textarea") {
              return (
                <Textarea
                  key={index}
                  id={input.id}
                  label={input.name}
                  placeholder={input.placeholder}
                  {...register(input.id, input.options)}
                  control={control}
                  errors={errors}
                  defaultValue={inputData[input.id]}
                  options={input.options}
                />
              );
            }
            if (mode === "edit" && input.name === "Location") {
              return null;
            } else if (input?.type === "file") {
              return (
                <FileUpload
                  key={index}
                  file={data}
                  handleFileChange={handleFileChange}
                  uploadProgress={uploadProgress}
                  loading={loading}
                  register={register}
                  errors={errors}
                />
              );
            } else if (input?.type === "radio") {
              return (
                <div
                  key={index}
                  className={`rounded-md mt-3 ${input?.className}`}
                >
                  {input?.options?.map((option, idx) => (
                    <label
                      key={idx}
                      className="mr-4 flex items-center text-white text-10 bg-transparent"
                    >
                      <input
                        type="radio"
                        value={option.altitude}
                        id={option.id}
                        name={option.name}
                        onChange={(e) => {
                          setInputData({
                            ...inputData,
                            altitude: e.target.value,
                          });
                        }}
                        disabled={loading}
                        defaultChecked={option.checked}
                        className="mr-2 w-6 h-6 text-primary accent-[#FC620A]"
                        {...register(option?.name)}
                      />
                      {option.text}
                    </label>
                  ))}
                </div>
              );
            }
            return (
              <Input
                key={index}
                name={input.name}
                id={input.id}
                type={input.type}
                steps={input.steps}
                placeholder={input.placeholder}
                register={register}
                min={input.min}
                errors={errors}
                options={input.options}
                className="bg-primary "
                title={input.title}
                svg={input.svg}
                value={inputData[input.id]}
              />
            );
          })}
          {validation && creditMessage}

          <Button
            type="submit"
            text={buttonTitle ? buttonTitle : title}
            className="rounded-md w-full mt-3"
            disabled={loading || isButtonDisabled}
          />
        </form>
      </div>
    </ModalLayout>
  );
};

export default ModalBox;
