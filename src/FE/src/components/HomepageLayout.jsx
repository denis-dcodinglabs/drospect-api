import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const HomepageLayout = () => {
  return (
    <div className="flex flex-col min-h-screen bg-background z-10 relative">
      <Navbar />
      <div className="px-5 lg:px-[133px] overflow-hidden">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
};

export default HomepageLayout;
