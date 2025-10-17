const ProjectCard = ({
  title,
  img,
  subtitle,
  active,
  className = 'text-center h-[500px]',
  hover,
}) => {
  return (
    <div className={`relative rounded-xl group overflow-hidden  ${className} `}>
      <img
        src={img}
        width={'100%'}
        className=" object-cover bg-bottom h-full "
        alt={title}
      />
      {active && (
        <div
          className={`absolute bottom-0 md:p-8 w-full ${
            hover
              ? 'hidden group-hover:block bg-gradient-to-t from-primary from-80%'
              : 'bg-gradient-to-t from-primary bg-opacity-40'
          }  text-white`}
        >
          <h1 className="text-xl">{title}</h1>
          <h5 className=" text-sm">{subtitle}</h5>
        </div>
      )}
    </div>
  );
};

export default ProjectCard;
