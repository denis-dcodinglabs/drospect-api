import React, { useState } from "react";
import Logo from "../assets/icons/Logo";
import Button from "./formComponents/Button";
import ArrowButton from "../assets/icons/ArrowButton";
import NavBarMobile from "./NavBarMobile";

import { Link } from "react-router-dom";

export const links = [
  {
    href: "/#home",
    name: "Home",
    spy: "home",
  },
  {
    href: "/#innovative",
    name: "Innovative",
    spy: "innovative",
  },
  {
    href: "/#howitworks",
    name: "How It Works",
    spy: "howitworks",
  },

  {
    href: "/#projects",
    name: "Projects",
    spy: "projects",
  },
  {
    href: "/#faq",
    name: "FAQ",
    spy: "faq",
  },
  {
    href: "/#team",
    name: "Team",
    spy: "team",
  },
  {
    href: "/pricing",
    name: "Pricing",
    spy: "pricing",
  },
];
const Navbar = ({ isFooter }) => {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const removeBlueBgOnClick = {
    webkitTapHighlightColor: "transparent",
  };

  return (
    <div
      className={`${
        isFooter ? "relative z-10" : "sticky z-50"
      }   top-0 w-full flex justify-between font-sans sm:p-nav bg-background py-4 px-5 sm:px-[133px]`}
    >
      <div className="w-full flex justify-between items-center ">
        <div className="logo xs:w-[30%] md:w-[25%]">
          <Link to="/#home">
            <a
              href="/"
              aria-label="Go to homepage"
              onClick={() => setIsNavOpen(false)}
            >
              <Logo />
            </a>
          </Link>
        </div>
        <div
          className={` xl:justify-end items-center w-[75%] gap-6 font-medium text-base hidden xl:flex relative  ${
            isFooter ? "text-[#656565]" : "text-white "
          } `}
        >
          {links.map((link) => {
            const commonProps = {
              style: link.style,
              className: isFooter
                ? " p-2"
                : "p-2 hover:bg-gradient-to-r hover:from-gradientThree hover:via-gradientTwo hover:to-gradientOne hover:inline-block hover:text-transparent hover:bg-clip-text",
            };
            return (
              <a
                href={link.href}
                data-to-scrollspy-id={link.spy}
                {...commonProps}
                key={link.name}
              >
                {link.name}
              </a>
            );
          })}
          <a href="/#book-a-demo">
            {isFooter ? (
              <Button
                className="text-[#656565]"
                text={"Book a Demo"}
                style={{
                  background: "linear-gradient(transparent,transparent)",
                }}
              />
            ) : (
              <Button
                className="rounded-full px-5 custom-button"
                text={"Book a Demo"}
                icon={<ArrowButton className="ml-2.5" />}
              />
            )}
          </a>
        </div>
        {!isFooter && (
          <div
            className="space-y-[5px] xl:hidden flex flex-col items-end cursor-pointer"
            onClick={() => setIsNavOpen((prev) => !prev)}
            style={removeBlueBgOnClick}
          >
            <span className="block h-0.5 w-5 animate-pulse bg-gray-600"></span>
            <span className="block h-0.5 w-5 animate-pulse bg-gray-600"></span>
            <span className="block h-0.5 w-5 animate-pulse bg-gray-600"></span>
          </div>
        )}
      </div>
      <NavBarMobile isNavOpen={isNavOpen} setIsNavOpen={setIsNavOpen} />
    </div>
  );
};

export default Navbar;
