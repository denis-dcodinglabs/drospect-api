const TitleSubtitle = ({ className }) => {
  return (
    <div className="pb-20">
      <h2
        className={`mb-4 text-xl sm:text-5xl font-extrabold text-white text-center ${className}`}
      >
        Innovative
      </h2>
      <div className="flex justify-center items-center">
        <p
          className={`font-light text-white text-center w-full sm:w-[80%] ${className}`}
        >
          Our cutting-edge technology combines the power of AI and ML to
          significantly improve and optimise the process of inspecting solar
          panel images. Utilising RGB and Thermal images captured by drones, our
          model swiftly and with high accuracy detects defects to keep your
          solar farm in peak condition.
        </p>
      </div>
    </div>
  );
};

export default TitleSubtitle;
