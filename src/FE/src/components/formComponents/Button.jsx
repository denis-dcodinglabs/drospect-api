import React from 'react';

const Button = ({
  icon,
  text,
  onClick,
  className,
  type,
  disabled,
  typeDelete,
}) => {
  return (
    <button
      className={` p-1.5 flex justify-center relative text-white ${
        typeDelete === 'delete'
          ? 'bg-red-700 hover:bg-red-600'
          : typeDelete === 'cancel'
          ? ' bg-gray-600 hover:bg-gray-500'
          : typeDelete === 'custom'
          ? ''
          : `custom-button`
      }  ${className} ${disabled ? 'opacity-50 hover:!bg-gray-500' : ''}`}
      onClick={onClick}
      type={type}
      aria-label={`bt-${text}`}
      disabled={disabled}
    >
      {text && text}
      {icon && <span className="ml-2">{icon}</span>}
    </button>
  );
};
export default Button;
