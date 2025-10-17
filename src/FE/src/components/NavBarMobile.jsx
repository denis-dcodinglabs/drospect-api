import React from "react";

import { links } from "./Navbar.jsx";
import { Link } from "react-router-dom";

const NavBarMobile = ({ isNavOpen, setIsNavOpen }) => {
  const currentYear = new Date().getFullYear();
  return (
    <div className={` ${isNavOpen ? "visible overflow-hidden" : "invisible"}`}>
      <div className="fixed top-14 inset-x-0 w-screen h-[calc(100dvh-60px)] z-50 bg-primary text-white overflow-hidden flex flex-col justify-between">
        <div className="flex flex-col justify-start items-center gap-y-5 pt-6 w-full">
          {links.map((link) => (
            <Link
              to={link.href.toLowerCase()}
              style={link.style}
              className="w-[100%] text-center"
              onClick={() => {
                setTimeout(() => {
                  setIsNavOpen(false);
                }, 50);
              }}
            >
              {link.name}
            </Link>
          ))}
          <Link
            to="/#book-a-demo"
            className="w-[100%] text-center"
            onClick={() => {
              setTimeout(() => {
                setIsNavOpen(false);
              }, 50);
            }}
          >
            Book a Demo
          </Link>
        </div>
        {/* <div className="h-[47%]" onClick={() => setIsNavOpen(false)}></div> */}
        <div className="flex justify-center items-end  inset-x-0">
          <h1>Copyright {currentYear}©</h1>
        </div>
      </div>
    </div>
  );
};

export default NavBarMobile;
