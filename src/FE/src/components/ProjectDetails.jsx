import React from "react";

const ProjectDetails = ({ project, className = "" }) => {
  return (
    <div className={`pb-2 w-full ${className}`}>
      {project?.location && <p>Location: {project?.location}</p>}
      {project?.megawatt && (
        <p className="text-gray-200 font-medium">
          MegaWatt: {project?.megawatt}
        </p>
      )}
      {project?.drone && (
        <p className="text-gray-200 font-medium">
          Drone: {project?.drone?.make} - {project?.drone?.model}
        </p>
      )}
    </div>
  );
};

export default ProjectDetails;
