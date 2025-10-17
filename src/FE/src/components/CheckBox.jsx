import Checkbox from '../assets/icons/Checkbox';

export default function CheckBox({ onChange, checked, label, className }) {
  return (
    <div className={className}>
      <div
        className="flex items-center w-full  cursor-pointer"
        onClick={onChange}
      >
        <div
          className={`w-6 h-6 rounded-md flex justify-center items-center text-primary transition-colors duration-200 ${
            checked ? 'bg-gray-200 text-white' : 'bg-gray-200'
          }`}
        >
          {checked && <Checkbox />}
        </div>
        <label
          htmlFor="checkbox"
          className="pl-2 text-sm w-fit font-medium text-gray-200 cursor-pointer"
        >
          {label}
        </label>
      </div>
    </div>
  );
}
