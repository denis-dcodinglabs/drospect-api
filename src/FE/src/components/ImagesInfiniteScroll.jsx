import InfiniteScroll from "react-infinite-scroll-component";
import ArrowButton from "../assets/icons/ArrowButton";
import ImageColorCategory from "./ImageColorCategory";
import ModalImage from "./ModalImage";
import ConfirmModal from "./ConfirmModal";
import ThumbnailImage from "./ThumbnailImage";

function ImageInfiniteScroll({
  fetchData,
  items = [],
  hasMore,
  setImage,
  error,
  imageSelect,
  imageRefs,
  showImage,
  loading,
  deleting, // <-- add this prop
  handleImageClick,
  handleFixes,
  image,
  selectedImages,
  handleImageSelect,
  openDelete,
  handleDelete,
  handleDeleteSelectedImages,
}) {
  return (
    <div>
      <ConfirmModal
        title={"Are you sure you want to delete this Images?"}
        handleClose={handleDelete}
        open={openDelete}
        onSubmit={handleDeleteSelectedImages}
        loading={deleting} // <-- use deleting here
        buttonText={"Delete"}
      />
      <InfiniteScroll
        dataLength={items?.length}
        next={fetchData}
        hasMore={hasMore}
        loader={
          <div className="flex justify-center animate-[bounce_1.5s_ease-in-out_infinite] py-8">
            <p className="text-xl flex justify-center items-center  rotate-90 w-fit rounded-full">
              <ArrowButton />
            </p>
          </div>
        }
        endMessage={
          <div className="flex justify-center py-8">
            <p className="text-xl flex justify-center items-center py-4 px-4 lg:px-32 border border-purple text-white w-fit rounded-xl">
              No more pictures to load!
            </p>
          </div>
        }
      >
        <div className="grid grid-cols-2 overflow-hidden sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 p-2 gap-4">
          {items?.map((item, index) => (
            <div
              ref={(el) => (imageRefs.current[index] = el)}
              className={`relative border-2 rounded-lg group/delete transform transition-all duration-300 ${
                imageSelect === item.id
                  ? "border-red-500 scale-110"
                  : selectedImages.some(
                      (selectedImage) => selectedImage.imageId === item.id,
                    )
                  ? "border-gradientThree  scale-105 border-4"
                  : "border-transparent"
              }`}
              key={index}
            >
              <div className="relative h-20 xl:h-28 w-full bg-cover rounded-lg overflow-hidden">
                <ImageColorCategory item={item} />

                <ThumbnailImage
                  onClick={() => handleImageSelect(item)}
                  onDoubleClick={() => handleImageClick(item)}
                  className="h-20 xl:h-28 w-full bg-cover rounded-lg object-cover"
                  src={item?.image}
                  thumbnailUrl={item?.thumbnailUrl}
                  alt={item?.id}
                />
              </div>
            </div>
          ))}
        </div>
      </InfiniteScroll>
      <ModalImage
        item={image}
        images={items}
        setImage={setImage}
        isLoading={loading}
        show={showImage}
        setShow={handleImageClick}
        handleFixes={handleFixes}
        handleImageClick={handleImageClick}
      />
      {error && <p>Error: {error.message}</p>}
    </div>
  );
}

export default ImageInfiniteScroll;
