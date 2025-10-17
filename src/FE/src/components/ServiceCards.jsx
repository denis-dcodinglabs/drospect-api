import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const ServiceCard = ({ title, description, img, icon, svg, team }) => {
  return (
    <div className="relative group cursor-pointer">
      <div className="w-full h-64 rounded-lg overflow-hidden shadow-lg">
        {icon && (
          <FontAwesomeIcon
            icon={icon}
            size="3x"
            className="absolute z-5 -top-2.5 -left-2.5 transition-all duration-700 group-hover:left-[90%] text-[#3c329d]"
          />
        )}
        {svg && (
          <img
            src={svg}
            alt="object"
            className="absolute w-20 z-[5] top-[-28px] left-[-10px] sm:left-[-30px] transition-all duration-700 group-hover:left-[80%] opacity-[80%]"
          />
        )}
        <img
          className="w-full h-full object-cover object-center group-hover:opacity-50 aspect-[4/3]"
          src={img}
          alt={title}
        />
        <div className="absolute rounded-lg bottom-0 h-full inset-0 flex items-end justify-start bg-black bg-opacity-0 group-hover:bg-opacity-80 transition-opacity duration-700">
          <div className="p-9 text-white text-center flex flex-col justify-end items-start mt-3 h-full">
            <h2 className="absolute top-[80%] h-[20%] group-hover:top-[10%] transition-all duration-700 text-xl font-extrabold mb-2 text-white drop-shadow-lg">
              {title}
            </h2>
            <p className="opacity-0 h-[80%] group-hover:opacity-100 active:opacity-100 transition-all duration-[900ms] text-left">
              {description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceCard;
