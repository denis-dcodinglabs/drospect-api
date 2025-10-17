import React, { useState } from "react";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import axiosInstance from "../../axiosInstance";
import { toast } from "react-toastify";
import ThumbnailImage from "../../components/ThumbnailImage";

export default function CameraImageUpload({ src, alt, onImageUpload }) {
  const [preview, setPreview] = useState();

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      // Create FormData object to send the file
      const formData = new FormData();
      formData.append("image", file);

      try {
        const response = await axiosInstance.postData(
          "/user/update-profile",
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
          },
        );

        // Call the parent component's onImageUpload with the response data
        if (response?.status === "Ok!") {
          setPreview(response?.data?.imageUrl);
          toast.success("Image uploaded successfully!");
        }
      } catch (error) {
        console.error("Error uploading image:", error);
      }
    }
  };

  return (
    <div className="relative group">
      <ThumbnailImage
        src={preview || src}
        thumbnailUrl={null}
        alt={alt}
        className="w-32 h-32 rounded-full object-cover border-4 border-purple-500"
      />
      <label className="absolute bottom-0 right-0 bg-purple-500 p-2 rounded-full cursor-pointer group-hover:bg-orange-400 transition-colors">
        <PhotoCameraIcon />
        <input
          type="file"
          className="hidden"
          accept="image/*"
          onChange={handleImageChange}
        />
      </label>
    </div>
  );
}
