import React from 'react';
import DroneHeroPage from '../assets/icons/DroneHeroPage';
import SolarPanelHeroPage from '../assets/icons/SolarPanelHeroPage';
import GraphHeroPage from '../assets/icons/GraphHeroPage';
import LinesHeroPage from '../assets/icons/LinesHeroPage';
import Shadow from '../assets/icons/Shadow';
import Title from '../components/Title';
import LineWithGradient from '../assets/icons/LineWithGradient';

const HeroPage = () => {
  const borderLineStyle = {
    border: '2px solid #0000',
    borderBottom: 'none',
    borderBottomRightRadius: 0,
    background:
      'linear-gradient(#1F2135,#100B20) padding-box, linear-gradient(to bottom, #7000FF , #FF6B00, #100B20)  border-box',
  };

  return (
    <div
      className=" flex flex-col items-center pb-24 pt-10  lg:pt-24 overflow-hidden"
      id="home"
    >
      <div className="absolute w-full top-0 -z-10">
        <LineWithGradient />
      </div>
      <div
        className="text-white pb-20 max-w-full md:w-[934px]"
        data-aos="fade-up"
      >
        <Title
          title={' AI-powered Inspections'}
          description={
            'Identify underperforming solar panels and optimise your operations of commercial solar parks via drone-based inspections and advanced machine learning algorithms.'
          }
        />
      </div>
      <div className="w-full" data-aos="zoom-in" data-aos-duration="3000">
        <Shadow />
      </div>

      <div
        className="flex flex-col justify-center items-center pt-2 sm:pt-20 w-full lg:w-[934px] rounded-3xl z-10"
        style={borderLineStyle}
      >
        <div data-aos="zoom-in" data-aos-duration="3000">
          <DroneHeroPage className="w-64 sm:w-auto" />
        </div>
        <div className="flex p-1 sm:p-16 max-w-full md:w-[934px]">
          <div className="w-full sm:w-1/2 h-full">
            <SolarPanelHeroPage width={'100%'} height={'100%'} />
          </div>

          <div className=" flex flex-col justify-between items-start pl-2 sm:pl-10 max-w-full w-full sm:gap-y-[60px] sm:w-1/2">
            <p className="text-white w-full text-xs sm:text-lg">
              Boost your maintenance efficiency by reducing costs up to 50% and
              inspection time up to 70%.
            </p>
            <div className="w-full">
              <LinesHeroPage width="100%" />
            </div>
            <GraphHeroPage className={'w-full'} />
          </div>
        </div>
      </div>
    </div>
  );
};
export default HeroPage;
