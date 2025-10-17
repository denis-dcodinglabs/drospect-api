import { useState, useEffect } from "react";
import axiosInstance from "../../axiosInstance";
import { toast } from "react-toastify";

export default function ProjectCount({ count }) {
  const [projectCount, setProjectCount] = useState(null);

  const fetchCount = async () => {
    try {
      const res = await axiosInstance.getData(`/projects/me`);
      setProjectCount(res.data.length);
    } catch (err) {
      toast.error(err.message);
    }
  };

  useEffect(() => {
    fetchCount();
  }, []);

  return (
    <div className="bg-[#2a2535] p-6 rounded-xl flex justify-center md:justify-start items-center">
      <div>
        <div className="flex items-center gap-3 mb-4 justify-center md:justify-start">
          <h3 className="text-xl font-bold">Projects</h3>
        </div>
        <div className="text-4xl font-bold text-purple-400 flex justify-center md:justify-start">
          {projectCount}
        </div>
        <p className="text-gray-400 mt-2">Active projects</p>
      </div>
    </div>
  );
}
