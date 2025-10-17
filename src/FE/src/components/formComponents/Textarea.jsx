import React from 'react';
import { Controller } from 'react-hook-form';

const Textarea = ({
  id,
  label,
  placeholder,
  errors,
  required = true,
  control,
  className,
  defaultValue,
  options,
}) => {
  const errorShowMessage = (error) => (
    <p className="text-red-600 text-sm">{error}</p>
  );
  return (
    <Controller
      control={control}
      name={id}
      rules={options}
      defaultValue={defaultValue}
      render={({ field: { onChange, value } }) => (
        <div>
          <label
            className="block text-gray-200 text-base font-bold mb-2"
            htmlFor={id}
          >
            {label}
          </label>
          <textarea
            id={id}
            placeholder={placeholder}
            className={`  ${className}  form-control w-full px-2.5 py-1.5 text-lg text-gray-400 rounded-lg border border-solid border-gray-700 focus:border-pink-600 focus:outline-none h-20 bg-primary`}
            onChange={onChange}
            value={value}
          />
          {errors[id] && errorShowMessage('This field is required!')}
        </div>
      )}
    />
  );
};

export default Textarea;
