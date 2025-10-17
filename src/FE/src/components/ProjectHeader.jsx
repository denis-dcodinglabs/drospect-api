import React from 'react';

const ProjectHeader = ({ project }) => {
  return (
    <div className="pb-10 w-full md:w-[40%] md:pb-1 flex flex-col justify-start">
      <h1 className="text-center md:text-start text-2xl">{project?.name}</h1>
      <h3 className="text-center md:text-start pt-2 text-lg w-full">
        {project?.description}
      </h3>
    </div>
  );
};

export default ProjectHeader;
