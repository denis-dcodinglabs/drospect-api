import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet';

import Technology from './Technology';
import Client from './Client';
import ContactUs from './Contactus';
import ScrollSpy from 'react-ui-scrollspy';
import HeroPage from './HeroPage';
import Slider from './Slider';
import Team from './Team';
import Inovative from './Inovative';
import { useLocation } from 'react-router-dom';

const Home = () => {
  const location = useLocation();
  useEffect(() => {
    if (location.hash) {
      const element = document.querySelector(location.hash);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [location]);
  return (
    <ScrollSpy scrollThrottle={0}>
      <Helmet>
        <title>
          Drospect | AI-powered inspection of drone captured images for Solar
          Panels
        </title>
        <meta
          name="description"
          content="Drospect specializes in providing AI-powered software for processing drone-based images to identify underperforming solar panels. Optimize your solar park operations with advanced machine learning and thermal imaging. Boost maintenance efficiency by reducing costs by up to 50% and inspection time by up to 70%."
        />
        <meta
          name="keywords"
          content="AI-powered inspections, drone inspections, solar panel optimization, commercial solar parks, machine learning, RGB imaging, thermal imaging, infrastructure inspections, maintenance efficiency, cost reduction, Drospect, solar park maintenance, drone technology, predictive maintenance, solar energy, renewable energy solutions, advanced inspections"
        />
        <link rel="canonical" href="https://www.drospect.ai" />
      </Helmet>
      <HeroPage />
      <Inovative />
      <Technology />
      <Slider />
      <Client />
      <Team />

      <ContactUs />
    </ScrollSpy>
  );
};

export default Home;
