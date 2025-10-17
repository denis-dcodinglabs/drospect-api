const NotFound = () => {
  return (
    <div className="w-full h-full flex  justify-center items-center">
      <div className="flex items-center justify-center min-h-[65vh]">
        <div className="text-center text-white">
          <h1 className="text-primary font-bold text-9xl p-2 bg-gradient-to-r from-gradientThree via-gradientTwo to-gradientOne inline-block text-transparent bg-clip-text">
            404
          </h1>
          <h2 className=" bg-clip-text font-display text-2xl font-bold md:font-bold m-6 text-center uppercase">
            OOPS, THE PAGE YOU ARE LOOKING FOR CAN'T BE FOUND!
          </h2>
          <a
            href={'/'}
            className=" hover:bg-gradient-to-r hover:from-gradientThree hover:via-gradientTwo hover:to-gradientOne hover:inline-block hover:text-transparent hover:bg-clip-text"
          >
            Return To Home
          </a>
        </div>
      </div>
    </div>
  );
};
export default NotFound;
