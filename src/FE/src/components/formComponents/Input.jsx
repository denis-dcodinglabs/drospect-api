import { Tooltip } from '@mui/material';
import React from 'react';

const Input = ({
  name,
  id,
  type = 'text',
  steps,
  placeholder = '',
  onChange,
  register,
  errors = {},
  options,
  className = '',
  min,
  title,
  svg,
  value = '',
}) => {
  const errorShowMessage = (error) => <p className="text-red-600">{error}</p>;

  return (
    <div>
      <div className="flex w-full justify-start items-center gap-1">
        {name && <label htmlFor={id}>{name}</label>}
        {svg && (
          <Tooltip title={title} placement="right">
            <div className="w-5">{svg}</div>
          </Tooltip>
        )}
      </div>
      <input
        id={id}
        type={type}
        step={steps}
        placeholder={placeholder}
        className={`border border-black rounded-md mt-1 p-2 w-full ${className}`}
        min={min}
        defaultValue={value}
        onChange={onChange}
        {...(register && register(id, options))}
      />
      {errors[id] && errorShowMessage(errors[id].message)}
    </div>
  );
};

export default Input;
