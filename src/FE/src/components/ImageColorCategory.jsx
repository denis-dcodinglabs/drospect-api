import Repair from "../assets/icons/Repair";

const itemColorCategory = ({ item }) => {
  const getBackgroundClasses = (isInspected, isHealthy) => {
    if (!isInspected) return ["bg-orange-300", "bg-orange-600"];
    if (isHealthy) return ["bg-green-300", "bg-green-600"];
    return ["bg-red-300", "bg-red-600"];
  };

  return (
    <div
      className={`absolute flex  ${
        item.isInspected ? "justify-start" : "justify-between"
      }  gap-1 w-full z-10`}
    >
      <div
        className={` h-4  p-0.5 w-4 flex justify-center items-center ${
          getBackgroundClasses(item.isInspected, item.isHealthy)[0]
        } rounded-full right-1 top-1 `}
      >
        <div
          className={`h-3 w-full flex justify-center items-center px-1 p ${
            getBackgroundClasses(item.isInspected, item.isHealthy)[1]
          } rounded-full  `}
        ></div>
      </div>
      {item.isFixed && (
        <div className="w-4 h-4 rounded-full bg-orange-600 flex items-center justify-center p-0.5">
          <Repair className="w-full h-full" />
        </div>
      )}
    </div>
  );
};
export default itemColorCategory;
