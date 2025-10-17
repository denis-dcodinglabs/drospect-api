import React, { useEffect, useState } from "react";
import axiosInstance from "../../../axiosInstance";
import Button from "../../../components/formComponents/Button";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import ModalBox from "../../../components/ModalBox";
import Title from "../../../components/Title";
import moment from "moment";
import Delete from "../../../assets/icons/Delete";
import ConfirmModal from "../../../components/ConfirmModal";
import ProjectPanelStats from "../../../components/ProjectPanelStats";
import Ortho from "../../../assets/icons/Ortho";

const SkeletonCard = () => (
  <div className="animate-pulse">
    <div className="flex flex-col justify-between items-center rounded-xl bg-gray-800 h-40 w-full p-4">
      <div className="w-3/4 h-4 bg-gray-700 rounded"></div>
      <div className="w-full h-4 bg-gray-700 rounded mt-auto"></div>
    </div>
  </div>
);

export const inputs = [
  {
    name: "Name",
    id: "name",
    type: "text",
    placeholder: "Name",
    options: {
      required: "Name is required",
      minLength: {
        value: 3,
        message: "Minimum 3 characters required",
      },
    },
  },
  {
    name: "Description",
    id: "description",
    type: "textarea",
    placeholder: "Description",
    options: {
      minLength: {
        value: 5,
        message: "Minimum 5 characters required",
      },
    },
  },
  {
    name: "Megawatt",
    id: "megawatt",
    type: "number",
    steps: "0.1",
    min: 1,
    placeholder: "Megawatt",
    options: {
      min: {
        value: 1,
        message: "Minimum 1 megawatt required",
      },
    },
  },
];

const Main = () => {
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [update, setUpdate] = useState(false);
  const [sortOrder, setSortOrder] = useState("asc");
  const navigate = useNavigate(); // Use the hook to navigate

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();
  const [open, setOpen] = useState(false);
  const [id, setId] = useState(false);

  const handleOpen = () => setOpen(true);

  const handleClose = () => {
    reset();
    setOpen(false);
  };

  const [openDelete, setOpenDelete] = useState(false);

  const handleCloseDelete = (id) => {
    if (id) {
      setId(id);
    }
    reset();
    setOpenDelete(!openDelete);
  };

  const deleteProject = () => {
    axiosInstance
      .deleteData(`projects/${id}`)
      .then((res) => {
        toast.success("Project deleted successfully");
        setUpdate(!update);
      })
      .catch((err) => {
        toast.error("Error deleting project");
      });

    handleCloseDelete();
  };

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      data.megawatt = parseFloat(data.megawatt);
      await postData(data);
    } catch (err) {
      toast.error(err.message);
    }
    setLoading(false);
  };

  const postData = async (data) => {
    const res = await axiosInstance.postData("/projects", data);
    if (res.error) {
      return;
    }
    handleClose();
    toast.success("Project was added successfully!");
    setFilteredProjects((prevProjects) => [res.data.project, ...prevProjects]);
    navigate(`/admin/project/${res.data.project.id}`); // Use navigate to redirect
  };

  const sortProjects = () => {
    const sorted = [...filteredProjects].sort((a, b) => {
      const dateA = new Date(a.createdat).getTime();
      const dateB = new Date(b.createdat).getTime();
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    });

    setFilteredProjects(sorted);
    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const res = await axiosInstance.getData("/projects/me");
      setFilteredProjects(res.data);
      setLoading(false);
      if (res.error) {
        setLoading(false);
      }
    };
    fetchData();
  }, [update]);

  // hasOrthomosaic now comes from the /projects/me response per project

  return (
    <div className=" text-black flex justify-start flex-col w-full h-full overflow-hidden">
      <Title
        title={"Projects"}
        className={"text-xl flex relative items-start pb-8"}
      />
      <div className="mb-10 w-full px-8 flex justify-between items-center flex-wrap gap-4">
        <Button
          type="button"
          text="New Project"
          className="rounded-md px-8 "
          onClick={handleOpen}
        />
        <ModalBox
          mode={"create"}
          title={"Create Project"}
          open={open}
          handleClose={handleClose}
          handleSubmit={handleSubmit}
          onSubmit={onSubmit}
          inputs={inputs}
          register={register}
          control={control}
          errors={errors}
          loading={loading}
        />
        <ConfirmModal
          title={"Are you sure you want to delete project?"}
          handleClose={handleCloseDelete}
          open={openDelete}
          onSubmit={deleteProject}
          loading={loading}
          buttonText={"Delete"}
        />
        <div className="flex items-center gap-4">
          <Button
            type="button"
            text={`Sort by Date ${sortOrder === "asc" ? "↑" : "↓"}`}
            className="rounded-md px-8 flex items-center gap-2"
            onClick={sortProjects}
          ></Button>
        </div>
      </div>
      <div className="grid sm:grid-cols-2  lg:grid-cols-3 xl:grid-cols-5 gap-4 pb-4 px-8">
        {loading
          ? Array(15)
              .fill()
              .map((_, index) => <SkeletonCard key={index} />)
          : filteredProjects?.map((data) => {
              return (
                <div className="relative group/card">
                  {/* Panel Statistics - top left */}
                  <ProjectPanelStats panelStatistics={data?.panelStatistics} />

                  <button
                    className="absolute top-2 right-2  justify-between hidden group-hover/card:block items-center gap-3 px-2 py-1 rounded-md group cursor-pointer text-xl z-10"
                    onClick={() => handleCloseDelete(data?.id)}
                  >
                    <Delete
                      width="15px"
                      height="15px"
                      fill="#ffff"
                      className={"group-hover:fill-red-500 "}
                    />
                  </button>

                  {/* MW and Images info - top right (fixed, only moves on hover as a block) */}
                  <div className="absolute top-2 right-2 z-20 pointer-events-none">
                    <div className="flex flex-col items-end gap-1 text-xs transition-all duration-200 mt-0 group-hover/card:mt-7 pointer-events-auto">
                      {data?.megawatt && (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-md backdrop-blur-sm">
                          <svg
                            className="w-3 h-3 text-yellow-400"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.477.859h4z" />
                          </svg>
                          <span className="text-yellow-400 font-medium">
                            {data?.megawatt} MW
                          </span>
                        </div>
                      )}
                      {data?.imagecounter && data?.imagecounter > 0 && (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-md backdrop-blur-sm">
                          <svg
                            className="w-3 h-3 text-cyan-400"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span className="text-cyan-400 font-medium">
                            {data?.imagecounter}
                          </span>
                        </div>
                      )}
                      {data?.hasOrthomosaic && (
                        <div className="w-[38px] h-[38px]">
                          <Ortho width={"38px"} height={"38px"} />
                        </div>
                      )}
                    </div>
                  </div>

                  <Link
                    to={`/admin/project/${data?.id}`}
                    key={data?.id}
                    style={{ textDecoration: "none" }}
                  >
                    <tr
                      className="flex flex-col justify-between items-center rounded-xl text-white text-ellipsis overflow-hidden text-center h-40 w-full p-4 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/25"
                      style={{
                        border: "2px solid #0000",
                        borderBottom: "none",
                        background:
                          "linear-gradient(#222239,#352B53) padding-box, linear-gradient(to right, #FF6B00 0%, #DD0077 55%, #7000FF 100%) border-box",
                      }}
                    >
                      <td>
                        <h1 className="text-base pt-2 max-w-[96%]">
                          {data?.name}
                        </h1>
                      </td>

                      <td className="text-white flex justify-start h-40 w-full items-end">
                        <h4 className="text-gray-300 text-xs  bottom-0 right-0">
                          Created at:{" "}
                          {moment(data.createdat).format("DD/MM/YYYY")}
                          <br />
                          Last update:{" "}
                          {moment(data.updatedat).format("DD/MM/YYYY")}
                        </h4>
                      </td>
                    </tr>
                  </Link>
                </div>
              );
            })}
      </div>
      {!loading && filteredProjects?.length === 0 && (
        <div className="text-center text-gray-600 mt-8">
          <p>No projects found.</p>
        </div>
      )}
    </div>
  );
};

export default Main;
