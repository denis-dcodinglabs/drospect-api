import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import SideBar from "./SideBar";
import { useLocation } from "react-router-dom";
import useRefreshToken from "../hooks/useRefreshToken";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import { useSelector } from "react-redux";

const DashboardLayout = () => {
  const [isNavOpen, setIsNavOpen] = useState(false);

  const location = useLocation();

  const isImpersonating = useSelector(
    (state) => state.isAuthorizedReducer.isImpersonating,
  );

  const refreshToken = useRefreshToken();
  useEffect(() => {
    refreshToken(isImpersonating);
  }, [location.pathname]);

  return (
    <div className="flex relative flex-col md:flex-row text-white  min-h-screen w-full  bg-[#190B33]">
      <div
        className={`md:hidden flex px-4 pt-4 z-[999] w-full ${
          isNavOpen && " fixed top-4"
        } justify-end items-end cursor-pointer`}
        onClick={() => setIsNavOpen((prev) => !prev)}
      >
        {isNavOpen ? (
          <CloseIcon className="text-white text-2xl" />
        ) : (
          <MenuIcon className="text-white text-2xl" />
        )}
      </div>
      <div
        className={` ${isNavOpen ? "" : "hidden"}    md:block md:w-[100px] `}
      >
        <SideBar setNav={setIsNavOpen} />
      </div>
      <div className=" h-full  w-full md:pl-10 md:pt-10">
        <Outlet />
      </div>
    </div>
  );
};

export default DashboardLayout;
