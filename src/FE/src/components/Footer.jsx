import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  // faFacebook,
  faInstagram,
  faLinkedin,
} from "@fortawesome/free-brands-svg-icons";
import Logo from "../assets/icons/Logo";
import DroneFooter from "../assets/icons/DroneFooter";

const Footer = () => {
  const Icon = ({ icon }) => {
    return (
      <div
        className=" rounded-full text-[10px] h-9 w-9 flex justify-center items-center"
        style={{
          background: "linear-gradient(to right, #EE5A1A, #C04145)",
        }}
      >
        {icon}
      </div>
    );
  };

  const currentYear = new Date().getFullYear();

  return (
    <footer
      className=" md:px-20 md:pb-5 xs:pt-10 xs:px-5 xs:pb-2.5 xs:p-smhome"
      style={{
        borderTopWidth: "4px",
        borderTopStyle: "solid",
        borderImageSlice: 1,
        borderImageSource:
          "linear-gradient(to right, #200C43, #511EA9 , #200C43 )",
      }}
    >
      <div className=" sm:smhome lg:px-8 pb-8 xs:flex flex-col">
        <div className="pl-5 flex flex-col justify-center items-start gap-4">
          <Logo />

          <div className="pt-10 sm:pl-5 md:pl-0 flex flex-row justify-between ">
            <p className="sm:w-1/2 text-gray-400">
              Drospect is an innovative company specializing in drone-based
              solutions for infrastructure inspections. Utilizing cutting-edge
              technology, including RGB and thermal imaging, Drospect provides
              precise and efficient inspection services for solar panel parks.
            </p>
          </div>

          <div className="flex flex-row justify-between w-full sm:pl-5 md:pl-0 border-b">
            <div className="flex flex-col justify-end items-start">
              <div className="flex flex-row justify-start items-center">
                <ul className=" text-sm text-[#fff] flex justify-around items-start gap-5 z-[1]">
                  {/* <li className="w-[25%]">
                    <a
                      href="#home"
                      target="blank"
                      className=" transition hover:opacity-75"
                    >
                      <Icon
                        icon={<FontAwesomeIcon icon={faFacebook} size="2x" />}
                      />
                    </a>
                  </li> */}

                  <li className="w-[25%]">
                    <a
                      href="https://www.instagram.com/the.drospect/"
                      target="_blank"
                      aria-label="Follow us on Instagram"
                      rel="noopener noreferrer"
                      className=" transition hover:opacity-75"
                    >
                      <Icon
                        icon={<FontAwesomeIcon icon={faInstagram} size="2x" />}
                      />
                    </a>
                  </li>

                  <li className="w-[25%]">
                    <a
                      href="https://www.linkedin.com/company/drospect"
                      target="_blank"
                      aria-label="Follow us on Linkedin"
                      rel="noopener noreferrer"
                      className=" transition hover:opacity-75"
                    >
                      <Icon
                        icon={<FontAwesomeIcon icon={faLinkedin} size="2x" />}
                      />
                    </a>
                  </li>
                </ul>
              </div>
              <div className="gap-24 items-center pt-2.5">
                <p className="pb-12 text-xs text-gray-400">
                  &copy; {currentYear} - Drospect All rights reserved
                </p>
              </div>
            </div>
            <div className="h-44 hidden sm:block">
              <DroneFooter />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
