const Title = ({ title, description, className, classNameDescription }) => {
  return (
    <div className={`${className}`}>
      <h1 className="text-4xl font-bold text-white py-4 px-8 text-center">
        {title}
      </h1>
      <p className={`text-center text-gray-400 ${classNameDescription}`}>
        {description}
      </p>
    </div>
  );
};

export default Title;
