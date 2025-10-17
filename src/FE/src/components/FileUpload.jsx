import React, { useState } from "react";
import Upload from "../assets/icons/Upload";
import ProgressBar from "./ProgressBar";

function FileUpload({ file, setFile, error, loading, uploadProgress }) {
  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = (event) => {
    const selectedFiles = event.target.files;
    if (selectedFiles.length > 0) {
      setFile(selectedFiles);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragActive(false);
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      setFile(files);
    }
  };

  return (
    <div className="flex w-full justify-center items-center flex-col pt-10">
      <label
        htmlFor="file"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center w-full h-48 mb-6 border-2 ${
          dragActive ? "border-gradientThree" : "border-gray-400"
        } hover:border-gray-200 border-dashed rounded-lg cursor-pointer bg-buttonColor hover:bg-gray-700`}
      >
        <div className="flex flex-col w-full h-full items-center justify-center pt-5 pb-6">
          {loading ? (
            <div className="w-full h-full flex flex-col justify-end items-center p-4">
              <p className="text-white mb-2">Uploading your images...</p>
              <ProgressBar progress={uploadProgress} />
            </div>
          ) : (
            <>
              <Upload className={"h-8 w-8 text-gray-500"} />

              <p className="mb-2 text-center text-sm text-gray-400">
                <span className="font-semibold">Click to upload</span> or drag
                and drop
              </p>
              <p className="text-xs text-gray-400">Jpg or Png (MAX.15GB)</p>
              {file?.length > 0 && (
                <p className="text-lg text-gray-400 mt-2">
                  {file?.length === 1
                    ? file[0]?.name
                    : file?.length + " files selected"}
                </p>
              )}
            </>
          )}
        </div>
        <input
          id="file"
          type="file"
          accept=".jpg, .png, .JPG"
          className="hidden"
          disabled={loading}
          multiple
          onChange={handleFileChange}
        />
      </label>
      {error && <p className="text-red-600">File is Required</p>}
    </div>
  );
}

export default FileUpload;
