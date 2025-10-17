const Loading = ({ className, fullscreen }) => {
  return (
    <div
      className={`${
        fullscreen
          ? "absolute top-20 left-0 z-20 h-full w-full rounded-xl flex justify-center items-center bg-[#190B33]  backdrop-blur-sm"
          : ""
      }`}
    >
      <div
        className={` ${
          fullscreen ? "h-12 w-12" : "h-6 w-6"
        }  rounded-full border-2  border-white border-b-gray-400 animate-spin   ${className}`}
      ></div>
    </div>
  );
};

export default Loading;
