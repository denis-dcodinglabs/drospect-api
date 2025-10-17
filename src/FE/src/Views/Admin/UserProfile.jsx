import React, { useEffect } from "react";
import axiosInstance from "../../axiosInstance";
import Title from "../../components/Title";
import { toast } from "react-toastify";
import Loading from "../../components/Loading";
import { useDispatch, useSelector } from "react-redux";
import { updateUser, updateWallet } from "../../Redux/features/user/userSlice";
import CameraImageUpload from "./CameraImageUpload";
import ProfileEditForm from "./ProfileEditForm";
import ProjectCount from "./ProjectCount";

const UserProfile = () => {
  const userData = useSelector((state) => state.userReducer.user);
  const dispatch = useDispatch();
  const fetchData = async () => {
    try {
      const res = await axiosInstance.getData(`/user/me`);
      dispatch(updateUser(res.user.data));
      dispatch(updateWallet(res.wallet));
    } catch (err) {
      toast.error(err.message);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (!userData) {
    return <Loading fullscreen />;
  }
  return (
    <div className="flex justify-start flex-col relative w-full h-screen overflow-hidden">
      <Title title={"Profile"} className={"text-xl flex items-start md:pb-8"} />
      <div className="flex items-top h-auto pb-14">
        <div className="bg-[#2d1756] rounded-lg shadow-lg w-full flex flex-col md:flex-row h-fit p-8 text-center">
          <div className="flex flex-col w-auto items-center md:items-start p-8">
            <CameraImageUpload src={userData?.image} alt={"Profile Image"} />
          </div>
          <div>
            <ProfileEditForm userData={userData} />
          </div>
        </div>
      </div>
      <ProjectCount />
    </div>
  );
};

export default UserProfile;
