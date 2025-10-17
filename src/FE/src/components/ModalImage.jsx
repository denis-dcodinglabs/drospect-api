import {
  faAngleLeft,
  faAngleRight,
  faDownload,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Typography } from "@mui/material";
import Button from "../components/formComponents/Button";
import ModalLayout from "./ModalLayout";
import Textarea from "./formComponents/Textarea";
import CheckBox from "./CheckBox";
import axiosInstance from "../axiosInstance";
import { useForm } from "react-hook-form";
import { useEffect, useState, useCallback, useRef } from "react";
import TempPanelCard from "./TempPanelCard";
import ConfirmModal from "./ConfirmModal";
import { toast } from "react-toastify";
import Loading from "./Loading";
import Delete from "../assets/icons/Delete";
import Edit from "../assets/icons/Edit";
import ImageAnnotator from "./ImageAnnotator";
import { downloadImage, getImageFilename } from "../utils/imageUtils";

const ModalImage = ({
  item,
  show,
  images,
  setImage,
  handleImageClick,
  imageSelect,
  handleFixes,
  setShow,
  loading,
}) => {
  const {
    handleSubmit,
    control,
    reset,
    register,
    unregister,
    formState: { errors, defaultValues },
  } = useForm({ defaultValues: { comment: "" } });

  const [isFixed, setIsFixed] = useState(false);
  const [selected, setSelected] = useState(false);
  const [comments, setComments] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingModal, setLoadingModal] = useState(false);
  const [commentToEdit, setCommentToEdit] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [borderColor, setBorderColor] = useState("border-gray-300 border-2");
  const [emptyComent, setEmptyComment] = useState("");
  const imageContainerRef = useRef(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [hoveredPanelId, setHoveredPanelId] = useState(null);

  const panelInformation = item?.panelInformation;

  // Synchronized hover handlers
  const handlePanelHover = useCallback((panelId) => {
    setHoveredPanelId(panelId);
  }, []);

  const handlePanelLeave = useCallback(() => {
    setHoveredPanelId(null);
  }, []);

  const handleOpen = useCallback(() => {
    setIsFixed((prev) => !prev);
  }, []);

  const handleFixed = useCallback(() => {
    handleFixes(isFixed, item.id);
    setIsFixed((prev) => !prev);
    setShow(false);
  }, [handleFixes, isFixed, item.id, setShow]);

  const [openEdit, setOpenEdit] = useState(false);

  const handleEdit = (data) => {
    if (data) {
      setCommentToEdit(data);
      reset({ comment: data.comment });
    }
    setOpenEdit((prev) => !prev);
    setIsEditing((prev) => !prev);
    setBorderColor("border-green-500 border-2 pulse-border");
    reset();
  };

  const updateComment = async (data) => {
    setLoadingModal(true);
    try {
      const res = await axiosInstance.updateData(
        `comments/${commentToEdit.id}`,
        {
          comment: data.comment,
        },
      );

      if (res.error) {
        toast.error("Error updating comment: " + res.error);
        return;
      }

      toast.success("Comment updated successfully");
      handleEdit();
      fetchComments();

      // Reset the form and states
      reset({ comment: "" });
      setEmptyComment("");
    } catch (error) {
      toast.error("Error updating comment: " + error.message);
    } finally {
      setLoadingModal(false);
    }
  };

  const fetchComments = useCallback(async () => {
    if (!item.id) {
      setComments(null);
      return;
    }
    const response = await axiosInstance.getData(`/comments/image/${item.id}`);
    if (response.error) {
      return;
    }
    setComments(response?.data);
  }, [item.id]);

  const deleteComment = async (id) => {
    const response = await axiosInstance.deleteData(`comments/${id}`);
    if (response.error) {
      toast.error("Error deleting comment: " + response.error);
      return;
    }
    setComments((prevData) => prevData.filter((item) => item.id !== id));
    toast.success("Comment deleted successfully");
  };

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  useEffect(() => {
    setSelected(
      (item.isInspected && !item.isHealthy) || imageSelect === item.id,
    );
  }, [item, imageSelect]);

  const handleNext = useCallback(() => {
    const nextIndex = images.indexOf(item) + 1;
    if (nextIndex < images.length) {
      setIsLoading(true);
      setImage(images[nextIndex]);
    }
    setTimeout(() => {
      setIsLoading(false);
    }, 500);
  }, [images, item, setImage]);

  const handlePrevious = useCallback(() => {
    const previousIndex = images.indexOf(item) - 1;
    if (previousIndex >= 0) {
      setIsLoading(true);
      setImage(images[previousIndex]);
    }
    setTimeout(() => {
      setIsLoading(false);
    }, 500);
  }, [images, item, setImage]);

  const handleDownload = useCallback(async () => {
    if (!item?.image) return;

    try {
      const filename = getImageFilename(item.image);
      await downloadImage(item.image, filename);
      toast.success("Image downloaded successfully");
    } catch (error) {
      toast.error("Failed to download image");
      console.error("Download error:", error);
    }
  }, [item?.image]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "ArrowRight") {
        handleNext();
      } else if (event.key === "ArrowLeft") {
        handlePrevious();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleNext, handlePrevious]);

  const onSubmit = async (data) => {
    if (openEdit) {
      await updateComment(data);
      setBorderColor("border-gray-300 border-2 !important");
    } else {
      const comment = {
        imageId: item.id,
        comment: data.comment,
      };
      const res = await axiosInstance.postData(`comments`, comment);
      if (res.error) {
        toast.error("Error adding comment: " + res.error);
        return;
      }
      setComments((prevData) => [res.data, ...prevData]);
      toast.success("Comment added successfully");
    }
    reset();
  };

  const inputs = [
    {
      name: "Comment",
      id: "commentToEdit",
      type: "text",
      placeholder: "Enter your comment here",
      options: {
        required: "Comment is required",
        minLength: {
          value: 3,
          message: "Minimum 5 characters required",
        },
      },
    },
  ];
  const fileName = item.image && item?.image.split("/").pop();

  useEffect(() => {
    const updateImageSize = () => {
      if (imageContainerRef.current) {
        const { width, height } =
          imageContainerRef.current.getBoundingClientRect();
        setImageSize({ width, height });
      }
    };

    // Add a small delay to ensure the container is rendered
    const timer = setTimeout(updateImageSize, 100);
    window.addEventListener("resize", updateImageSize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateImageSize);
    };
  }, [item?.image, selected]);

  return (
    <ModalLayout
      open={show}
      handleClose={handleImageClick}
      className={` ${
        selected
          ? " h-[98%] md:w-[90%] xl:w-[60%]"
          : "h-[70%] md:w-[60%] xl:w-[50%] 2xl:h-[90%]"
      }  w-[98%]  md:h-[90%]  pb-5 p-3 md:p-6 overflow-x-hidden overflow-y-hidden`}
    >
      {isLoading && <Loading fullscreen />}

      <ConfirmModal
        title="Are you sure you want to change the image status to 'Healthy'?"
        handleClose={handleOpen}
        open={isFixed}
        onSubmit={handleFixed}
        buttonText="Yes"
        classNameButton="!bg-green-500 hover:!bg-green-400"
      />
      <div
        className="absolute right-0.5 top-1/2 -translate-y-1/2 z-30 md:right-1 w-10 h-10 cursor-pointer backdrop-blur-xl bg-white/20 hover:bg-white/30 rounded-full flex justify-center items-center"
        onClick={handleNext}
      >
        <FontAwesomeIcon icon={faAngleRight} className="text-xl" />
      </div>
      <div
        className="absolute left-0.5 top-1/2 -translate-y-1/2 z-30 md:left-1 w-10 h-10 cursor-pointer backdrop-blur-xl bg-white/20 hover:bg-white/30 rounded-full flex justify-center items-center"
        onClick={handlePrevious}
      >
        <FontAwesomeIcon icon={faAngleLeft} className="text-xl " />
      </div>

      <div className="w-full h-full flex justify-start flex-col pt-6 md:flex-row max-h-[700px] md:max-h-full">
        <Typography
          className="absolute w-3/4 top-3 left-0  flex justify-center items-center cursor-pointer"
          component="span"
          variant="body2"
        >
          <div className="w-full pl-6 text-xl">{fileName}</div>
        </Typography>
        <div
          className={`${
            selected ? "w-full md:w-2/3" : "w-full"
          } h-[63%] md:h-[100%]`}
        >
          <div className="w-full h-3/5 relative" ref={imageContainerRef}>
            <div
              className="absolute right-4 top-3 z-30 w-8 h-8 cursor-pointer backdrop-blur-sm hover:bg-green-500/60 rounded-full flex justify-center items-center transition-colors"
              onClick={handleDownload}
              title="Download Image"
            >
              <FontAwesomeIcon
                icon={faDownload}
                className="text-lg text-white"
              />
            </div>
            <ImageAnnotator
              imageUrl={item?.image}
              panelInformation={panelInformation}
              containerWidth={imageSize.width || 400}
              containerHeight={imageSize.height || 300}
              hoveredPanelId={hoveredPanelId}
              onPanelHover={handlePanelHover}
              onPanelLeave={handlePanelLeave}
              isRgbImage={item?.rgb}
            />
          </div>

          <form
            className="w-full flex items-top"
            onSubmit={handleSubmit(onSubmit)}
          >
            <div className="w-full flex flex-col">
              {
                <Textarea
                  className={`w-52 md:w-full !h-11 text-sm md:text-base ${borderColor}`}
                  id="comment"
                  placeholder="Enter your comment here..."
                  control={control}
                  options={{ required: true }}
                  errors={errors}
                  value={emptyComent} // Reflect the empty comment state
                  onChange={(e) => setEmptyComment(e.target.value)} // Update state on input
                />
              }
            </div>
            <div className="rounded-lg flex items-top py-1.5 h-full justify-end w-[40%]">
              <Button
                type="submit"
                text={isEditing ? "Update" : "Save"}
                className="rounded-lg px-5 items-center h-11 w-24 md:w-32"
                disabled={loading}
              />
            </div>
          </form>
          <div
            className={` ${
              selected ? " h-[30%]" : "h-[40%]"
            } w-full md:h-[30%] lg:h-[30%] flex flex-1 flex-col rounded-lg`}
          >
            {comments?.length >= 1 && (
              <p className="text-gray-400  px-2">Comments:</p>
            )}
            <div className="overflow-auto space-y-2">
              {comments?.map((comment, index) => (
                <div
                  key={index}
                  className="w-full relative pb-4 text-sm md:text-base text-gray-400 bg-[#170630] border border-solid border-[#374151] pl-3 pr-20 py-2  rounded-lg"
                >
                  {comment.comment}
                  <span className=" text-gray-300 text-xs absolute bottom-0.5 right-24 ">
                    Commented by: {comment.username}
                  </span>
                  <p className="text-gray-300 text-xs absolute bottom-0.5 right-4">
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </p>
                  <div className="absolute top-1 right-2 flex justify-center">
                    <button
                      className="justify-between block items-center gap-3 px-2 py-1 rounded-md group cursor-pointer text-xl"
                      onClick={() => handleEdit(comment)}
                    >
                      <Edit
                        width="15px"
                        height="15px"
                        fill="#ffff"
                        className={"group-hover:fill-gray-500 "}
                      />
                    </button>
                    <button
                      className="justify-between block items-center gap-3 px-2 py-1 rounded-md group cursor-pointer text-xl"
                      onClick={() => deleteComment(comment.id)}
                    >
                      <Delete
                        width="15px"
                        height="15px"
                        fill="#ffff"
                        className={"group-hover:fill-red-500"}
                      />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {selected && (
          <div className="w-full pt-2 md:w-1/3 h-full pl-2">
            <div className="w-full flex items-center space-x-2 py-4 sm:py-2 md:p-2 pr-2 rounded-lg">
              <CheckBox
                checked={isFixed}
                onChange={handleOpen}
                label="Check this box to change the status of the image to Healthy."
              />
            </div>
            <div className="w-11/12 overflow-y-auto max-h-52 md:max-h-[90%] lg:p-2">
              {panelInformation?.map((panelItem, index) => (
                <TempPanelCard
                  key={index}
                  item={panelItem}
                  isHovered={hoveredPanelId === panelItem.panelNumber}
                  onHover={() => handlePanelHover(panelItem.panelNumber)}
                  onLeave={handlePanelLeave}
                  isRgbImage={item?.rgb}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </ModalLayout>
  );
};

export default ModalImage;
