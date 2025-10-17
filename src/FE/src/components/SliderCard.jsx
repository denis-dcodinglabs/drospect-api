const SliderCard = ({
  title,
  img,
  subtitle,
  active,
  className = "text-center h-[500px]",
  hover,
}) => {
  return (
    <div
      data-aos="zoom-in-left"
      className={`relative rounded-xl group overflow-hidden cursor-pointer transform transition-all duration-500 ease-in-out hover:shadow-2xl hover:-translate-y-2 hover:shadow-primary/30  ${className} `}
    >
      <img
        src={img}
        width={"100%"}
        className={`object-cover bg-bottom h-full ${
          active
            ? "transform transition-all duration-500 ease-in-out group-hover:scale-105 group-hover:brightness-110"
            : ""
        }`}
        alt={title}
      />
      {active && (
        <div
          className={`absolute bottom-0 md:p-8 w-full transition-all duration-500 ease-in-out ${
            hover
              ? "opacity-0 group-hover:opacity-100 bg-gradient-to-t from-primary from-80%"
              : "bg-gradient-to-t from-primary bg-opacity-40"
          }  text-white`}
        >
          <h1
            className={`text-xl transition-all duration-700 ease-out ${
              hover ? "transform translate-y-4 group-hover:translate-y-0" : ""
            }`}
          >
            {title}
          </h1>
          <h5
            className={`text-sm transition-all duration-700 ease-out delay-150 ${
              hover ? "transform translate-y-4 group-hover:translate-y-0" : ""
            }`}
          >
            {subtitle}
          </h5>
        </div>
      )}
    </div>
  );
};

export default SliderCard;
