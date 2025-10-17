const ProgressBar = ({ progress }) => {
  return (
    <div className="w-full bg-gray-500 rounded-full h-6 relative">
      <div
        className="h-6 rounded-full text-center text-white font-bold flex items-center justify-center transition-all duration-500"
        style={{
          width: `${progress}%`,
          background: `linear-gradient(
            to right,
            rgba(255, 107, 0, 0.8) 0%,
            rgba(221, 0, 119, 0.8) 55%,
            rgba(112, 0, 255, 0.8) 100%
          )`,
        }}
      >
        {/* This div ensures the percentage text stays on top of the bar */}
        <div className="absolute inset-0 flex items-center justify-center">
          {progress}%
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;
