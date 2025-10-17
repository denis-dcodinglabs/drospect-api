const Card = ({ title, image, subtitles }) => {
  return (
    <div className="flex justify-center w-full">
      <div
        className="h-72 w-full rounded-2xl text-white flex flex-col items-center justify-between py-4 px-1 xl:px-4 cursor-pointer group transform transition-all duration-500 ease-in-out shadow-inner hover:shadow-2xl hover:-translate-y-2 hover:shadow-purple-600/30 hover:scale-105"
        style={{
          border: "2px solid #0000",
          borderBottom: "none",
          background:
            "linear-gradient( to bottom , #222239,#352B53) padding-box, linear-gradient(to top right  , #100B20 , #C3686D )  border-box",
        }}
      >
        <div className="w-full flex justify-center items-center py-4 h-[50%] overflow-hidden">
          <img
            src={image}
            alt="innovative"
            className="object-cover bg-bottom h-full transform transition-all duration-700 ease-in-out group-hover:scale-105 group-hover:brightness-105"
          />
        </div>
        <h1 className="text-xl text-center w-full pb-3 h-[12%] transform transition-all duration-600 ease-out group-hover:translate-y-[-2px] group-hover:text-purple-200">
          {title}
        </h1>
        <h2 className="text-base text-center w-full py-2 h-[38%] transform transition-all duration-600 ease-out delay-100 group-hover:translate-y-[-2px] group-hover:text-gray-200">
          {subtitles}
        </h2>
      </div>
    </div>
  );
};

export default Card;
