import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../axiosInstance";
import useTokenManager from "../../hooks/useTokenManager";
import { toast } from "react-toastify";
import { useDispatch } from "react-redux";
import { setRole } from "../../Redux/features/authorization/authorizationSlice";
import Button from "../../components/formComponents/Button";
import ModalBox from "../../components/ModalBox";
import { useForm } from "react-hook-form";

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openAddUserModal, setOpenAddUserModal] = useState(false);
  const navigate = useNavigate();
  const { switchToken } = useTokenManager();
  const dispatch = useDispatch();

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  const fetchUsers = async () => {
    setLoading(true);
    const response = await axiosInstance.getData("/user");
    setUsers(response.result);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleLoginAsUser = async (userId, username) => {
    setLoading(true);
    const response = await axiosInstance.postData("/auth/impersonate", {
      id: userId,
    });

    if (response.data?.token) {
      switchToken(response.data.token);
      dispatch(setRole());
      navigate("/admin/profile");
      toast.success("Successfully logged in as user " + username);
    }

    setLoading(false);
  };

  const handleAddUser = () => {
    setOpenAddUserModal(true);
  };

  const handleAddUserSubmit = async (data) => {
    const response = await axiosInstance.postData("/auth/register", {
      username: data.username,
      email: data.email,
      password: data.password,
      credits: data.credits ? parseInt(data.credits) : 0,
      name: data.username,
    });

    if (response.data) {
      toast.success("User added successfully");
      setOpenAddUserModal(false);
      fetchUsers();
      reset();
    }
  };

  const creatorsMap = useMemo(() => {
    const map = {};
    users.forEach((user) => {
      map[user.id] = user;
    });
    return map;
  }, [users]);

  const addUserInputs = [
    {
      name: "Username",
      id: "username",
      type: "text",
      placeholder: "Username",
      options: {
        required: "Username is required",
        minLength: {
          value: 3,
          message: "Minimum 3 characters required",
        },
      },
    },
    {
      name: "Email",
      id: "email",
      type: "email",
      placeholder: "Email",
      options: {
        required: "Email is required",
      },
    },
    {
      name: "Password",
      id: "password",
      type: "password",
      placeholder: "Password",
      options: {
        required: "Password is required",
        minLength: {
          value: 8,
          message: "Minimum 8 characters required",
        },
      },
    },
    {
      name: "Credits",
      id: "credits",
      type: "number",
      min: 0,
      placeholder: "Credits (optional)",
      options: {
        required: false,
        min: {
          value: 0,
          message: "Minimum 0 credits required",
        },
      },
    },
  ];

  return (
    <div className="mx-2 lg:mx-auto my-4 px-4">
      <ModalBox
        mode={"add"}
        title={"Add User"}
        open={openAddUserModal}
        handleClose={() => setOpenAddUserModal(!openAddUserModal)}
        handleSubmit={handleSubmit}
        onSubmit={handleAddUserSubmit}
        register={register}
        control={control}
        errors={errors}
        inputs={addUserInputs}
        loading={loading}
      />

      <div className="flex justify-end pb-10">
        <Button
          text="Add user"
          className="rounded-md px-4"
          onClick={handleAddUser}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-primary shadow-md rounded-2xl">
          <thead>
            <tr>
              <th className="py-3 px-6 bg-gray-800 text-left text-xs font-medium text-white uppercase tracking-wider">
                Name
              </th>
              <th className="py-3 px-6 bg-gray-800 text-left text-xs font-medium text-white uppercase tracking-wider">
                Email
              </th>
              <th className="py-3 px-6 bg-gray-800 text-left text-xs font-medium text-white uppercase tracking-wider">
                Created By
              </th>
              <th className="py-3 px-6 bg-gray-800 text-center text-xs font-medium text-white uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="text-white hover:text-gray-200">
            {loading
              ? Array.from({ length: 12 }).map((_, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-7 px-6">
                      <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                    </td>
                    <td className="py-7 px-6">
                      <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                    </td>
                    <td className="py-7 px-6">
                      <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                    </td>
                    <td className="py-7 px-6 text-center">
                      <div className="h-4 bg-gray-700 rounded w-1/2 mx-auto"></div>
                    </td>
                  </tr>
                ))
              : users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b hover:bg-gray-400 transition duration-200 hover:text-black"
                  >
                    <td className="py-4 px-6 text-sm text-gray-300">
                      {user.firstName} {user.lastName}
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-300">
                      {user.email}
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-300">
                      {user.createdBy
                        ? creatorsMap[user.createdBy]
                          ? `${creatorsMap[user.createdBy].firstName} (${
                              creatorsMap[user.createdBy].username
                            })`
                          : "Unknown"
                        : "System"}
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-300 text-center">
                      <button
                        onClick={() =>
                          handleLoginAsUser(user.id, user.username)
                        }
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                        disabled={loading}
                      >
                        Login as User
                      </button>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Users;
