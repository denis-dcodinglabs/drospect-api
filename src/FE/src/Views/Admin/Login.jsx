import React, { useState } from "react";
import { useForm } from "react-hook-form";
import Drone from "../../assets/icons/DroneHeroPage";
import axiosInstance from "../../axiosInstance";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../../assets/icons/Logo";
import { setIsAuthorized } from "../../Redux/features/authorization/authorizationSlice";
import { updateWallet, updateUser } from "../../Redux/features/user/userSlice";
import { setRole } from "../../Redux/features/authorization/authorizationSlice";
import { useDispatch } from "react-redux";
import Button from "../../components/formComponents/Button";
import LinesGroup from "../../assets/icons/LinesGroup";
import Input from "../../components/formComponents/Input";

const Login = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const onSubmit = async (data) => {
    await login(data);
    dispatch(setRole());
  };

  const login = async (postData) => {
    setLoading(true);
    const res = await axiosInstance.login(postData);

    if (res.error) {
      setError(res?.error.message);
      setLoading(false);

      return;
    }
    dispatch(setIsAuthorized(true));
    dispatch(updateUser(res.data.user));
    dispatch(updateWallet(res.data.wallet));
    navigate("/admin/projects");

    setLoading(false);
  };

  return (
    <div className="w-full h-full px-5 py-10 flex items-center justify-center text-gray-400 overflow-hidden ">
      <div className="absolute w-full left-0 top-0">
        <LinesGroup />
      </div>
      <div className="absolute top-36 w-full flex justify-end">
        <div className=" w-[30%] hidden xl:block">
          <div className="w-full flex justify-center">
            <Drone />
          </div>
        </div>
      </div>
      <div className=" rounded-3xl z-10 p-8 lg:p-14 bg-gradient-to-b from-[#1F2135] to-[#120D22] to-40%  w-full md:w-2/5 xl:px-32 xl:py-24">
        <div className="text-center pb-10 ">
          <Link to={"/"}>
            <Logo width="100%" height="100%" />
          </Link>
          <h1 className=" text-5xl mt-10 text-white text-left">Sign In</h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
          <Input
            name={"User Name"}
            id={"username"}
            type={"text"}
            placeholder={"Email or Username"}
            register={register}
            errors={errors}
            options={{
              required: "Email or username is required",
            }}
            className="w-full px-2 py-3 text-lg text-gray-400 rounded-lg border border-solid border-gray-700 focus:border-pink-600  focus:outline-none  bg-primary mb-2"
            title={"Email or Username"}
          />

          <Input
            name={"Password"}
            id={"password"}
            type={"password"}
            placeholder={"Enter your password"}
            register={register}
            errors={errors}
            options={{
              required: "Password is required",
            }}
            className="w-full px-2 py-3 text-lg text-gray-400 rounded-lg border border-solid border-gray-700 focus:border-pink-600  focus:outline-none  bg-primary mb-2"
            title={"Password"}
          />

          <p className="text-center text-red-600">{error}</p>
          <Button
            className="w-full my-10 rounded-lg py-3"
            type="submit"
            text="Sign In"
            disabled={loading}
          />
        </form>
      </div>
    </div>
  );
};

export default Login;
