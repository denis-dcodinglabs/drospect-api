import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axiosInstance from "../axiosInstance";
import { setIsAuthorized } from "../Redux/features/authorization/authorizationSlice";
import { useDispatch, useSelector } from "react-redux";
import axios from "../axiosInstance"; // Import Axios
import { toast } from "react-toastify";
import Logo from "../assets/icons/Logo";
import Vector from "../assets/icons/SidebarVector";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import LiveHelpIcon from "@mui/icons-material/LiveHelp";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import SmallLogo from "../assets/icons/SmallLogo";
import ModalBox from "./ModalBox";
import { useForm } from "react-hook-form";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import GroupIcon from "@mui/icons-material/Group";
import Button from "./formComponents/Button";
import useTokenManager from "../hooks/useTokenManager";

const SideBar = ({ setNav }) => {
  const inputs = [
    {
      id: "subject",
      type: "text",
      placeholder: "Subject",
      options: {
        required: "Subject is required",
        minLength: {
          value: 3,
          message: "Minimum 3 characters required",
        },
      },
    },
    {
      id: "message",
      type: "textarea",
      placeholder: "Message",
      options: {
        required: "Message is required",
        minLength: {
          value: 3,
          message: "Minimum 3 characters required",
        },
      },
    },
  ];

  const isImpersonating = useSelector(
    (state) => state.isAuthorizedReducer.isImpersonating,
  );
  const { revertToAdminToken } = useTokenManager();

  const handleRevert = () => {
    revertToAdminToken();
    window.location.href = "/admin/profile";
  };

  const location = useLocation();
  const [currentTab, setCurrentTab] = useState("");

  const [openContactUs, setOpenContactUs] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [loading, setLoading] = useState(false);

  const role = useSelector((state) => state.isAuthorizedReducer.role);
  const credits = useSelector((state) => state.userReducer.wallet.credits);
  const userData = useSelector((state) => state.userReducer.user);

  const onSubmit = async (data) => {
    setLoading(true);
    const response = await axios.postData("contactus/client", data);
    setLoading(false);
    if (response.error) {
      return;
    }
    toast.success(response.data.message);

    setOpenContactUs(false);
  };
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  const handleContactUs = () => {
    setOpenContactUs((prev) => !prev);
    reset();
  };

  const handleLogOut = () => {
    axiosInstance.logout();
    dispatch(setIsAuthorized(false));
    navigate("/login");
  };

  useEffect(() => {
    const path = location.pathname;
    setNav(false);
    setCurrentTab(path.split("/")[2]);
  }, [location, setNav]);

  const links = [
    {
      to: "/admin/projects",
      icon: (
        <AccountTreeOutlinedIcon
          fontSize="large"
          className={`${
            ["projects", "project"].includes(currentTab)
              ? "text-gray-300"
              : "text-gray-400"
          } group-hover:text-gray-300 transition duration-300`}
        />
      ),
      label: "Projects",
      tab: ["projects", "project"],
      underLabel: null,
    },
    {
      to: "/admin/profile",
      icon: (
        <AccountCircleIcon
          fontSize="large"
          className={`${
            ["profile"].includes(currentTab) ? "text-gray-300" : "text-gray-400"
          } group-hover:text-gray-300 transition duration-300`}
        />
      ),
      label: "Profile",
      tab: ["profile"],
      underLabel: null,
    },
    {
      to: "/admin/credits",
      icon: (
        <CreditCardIcon
          fontSize="large"
          className={`${
            ["credits"].includes(currentTab) ? "text-gray-300" : "text-gray-400"
          } group-hover:text-gray-300 transition duration-300`}
        />
      ),
      label: "Credits",
      tab: ["credits"],
      underLabel: credits.toString(),
    },
    {
      to: "/admin/users",
      icon: (
        <GroupIcon
          fontSize="large"
          className={`${
            ["users"].includes(currentTab) ? "text-gray-300" : "text-gray-400"
          } group-hover:text-gray-300 transition duration-300`}
        />
      ),
      label: "Users",
      tab: ["users"],
      underLabel: null,
    },
  ];

  return (
    <div className="fixed top-0 left-0 h-full w-full md:w-[100px] md:hover:w-[253px] bg-background min-w-[70px] md:min-w-[70px] z-50 transition-all ease-in-out duration-300 group/slider">
      <div>
        <ModalBox
          mode={"textarea"}
          modalClassName={"md:w-[45%] w-96"}
          title={"Book a Demo"}
          open={openContactUs}
          handleClose={handleContactUs}
          handleSubmit={handleSubmit}
          onSubmit={onSubmit}
          inputs={inputs}
          register={register}
          control={control}
          errors={errors}
          loading={loading}
        />
      </div>
      <div className="flex flex-col h-full " onClick={() => setNav(false)}>
        <div className="items-center justify-center h-[10%] py-6 group-hover/slider:block md:hidden transition-all ease-in-out duration-300 delay-200">
          <Logo fillColor="transparent" width="100%" />
        </div>
        <div className="items-center justify-center  h-[10%] py-6 hidden md:block group-hover/slider:hidden transition-all ease-in-out duration-300">
          <SmallLogo fillColor="transparent" width="100%" />
        </div>
        <div className="h-3/4 z-20">
          <ul className="flex flex-col gap-4 pl-2 !z-20">
            {links.map((link, index) => {
              if (link.to === "/admin/users" && role !== 2) {
                return null;
              }
              return (
                <li key={index}>
                  <Link to={link.to} className="overflow-hidden ">
                    <button
                      className={`w-full text-left p-3 md:p-5 group items-center justify-start rounded-l-full ${
                        link.tab.includes(currentTab)
                          ? "bg-[#190B33] text-gray-300"
                          : "bg-transparent text-gray-400"
                      }`}
                    >
                      <div className="flex items-center">
                        {link.icon}
                        <span
                          className={`ml-4 text-xl w-fit md:text-xs group-hover/slider:text-xl font-bold group-hover:text-gray-300 md:opacity-0 transform transition-all group-hover/slider:duration-500 group-hover/slider:opacity-100 delay-400`}
                        >
                          {link.label}
                        </span>
                      </div>
                      {link.underLabel && (
                        <span className=" ml-1 group-hover/slider:ml-14 text-sm transform transition-all  text-gray-300 group-hover:text-gradientThree">
                          {link.underLabel}
                        </span>
                      )}
                    </button>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex flex-col items-center justify-center  h-[15%]  z-10 pl-4 pb-7">
          {isImpersonating && (
            <div className="z-20 flex flex-col items-center justify-center bg-gradientThree w-[80%] px-[5px] py-[3px] rounded-md gap-1">
              <span className="text-white font-semibold text-[14px] md:hidden md:group-hover/slider:block md:group-hover/slider:text-md transform transition-all duration-500 delay-400">
                Logged in as: {userData?.username}
              </span>
              <Button
                onClick={handleRevert}
                className="bg-primary text-white px-3 py-1 text-[12px] rounded-md md:w-auto group-hover/slider:text-md"
                text={
                  <span className="flex items-center gap-1">Back as admin</span>
                }
              />
            </div>
          )}
          {/* Help Button */}
          <button
            className="w-full p-3 hover:text-gray-300 text-gray-400 !flex !outline-none items-center justify-center md:justify-start rounded-l-full group"
            onClick={() => handleContactUs()}
          >
            <LiveHelpIcon
              className="group-hover:text-gray-300 text-gray-400"
              sx={{ fontSize: 26 }}
            />
            <span className="ml-3 text-xl md:text-[4px] group-hover/slider:text-xl  md:opacity-0 transform  transition-all group-hover/slider:duration-500 group-hover/slider:opacity-100 group-hover/slider:translate-y-0 delay-400">
              Contact us
            </span>
          </button>
          {/* Logout Button */}
          <button
            onClick={handleLogOut}
            className="w-full pl-3 py-2 hover:text-gray-300 text-gray-400 !flex items-center !outline-none  justify-center md:justify-start rounded-l-full group"
          >
            <LogoutOutlinedIcon className="group-hover:text-gray-300 text-gray-400 " />
            <span className="ml-3 text-xl md:text-[4px] group-hover/slider:text-xl md:opacity-0 transform  transition-all group-hover/slider:duration-500  group-hover/slider:opacity-100 group-hover/slider:translate-y-0 delay-400">
              Log out
            </span>
          </button>
        </div>
        {/* Vector Icon */}
        <div className="absolute !z-0 bottom-5 md:-translate-x-44 left-0 md:opacity-0 group-hover/slider:opacity-100 transform  ease-in-out transition-all duration-200 group-hover/slider:delay-100 group-hover/slider:translate-x-0">
          <Vector fillColor="transparent" />
        </div>
      </div>
    </div>
  );
};

export default SideBar;
