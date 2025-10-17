import React from 'react';
import InovativeSolar from '../assets/InovativeSolar.png';
import InovativeTemp from '../assets/InovativeTemp.png';
import InovativeInspection from '../assets/InovativeInspection.png';
import TitleSubtitle from '../components/TitleSubtitle';
import Card from '../components/Card';

const Innovative = ({ className }) => {
  const innovative = [
    {
      image: InovativeSolar,
      title: 'Anomaly Detection',
      subtitles:
        'Use our AI-powered detection software to identify faulty or low performing solar panels.',
    },
    {
      image: InovativeTemp,
      title: 'Temperature Readings',
      subtitles: 'Obtain temperature readings on faulty solar panels.',
    },
    {
      image: InovativeInspection,
      title: 'Precise Inspection',
      subtitles:
        'Pinpoint precise GPS location of faulty solar panels. Plan and execute maintenance with increased efficiency.',
    },
  ];

  return (
    <div className="flex flex-col items-center py-8" id="innovative">
      <div data-aos="fade-right">
        <TitleSubtitle />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10 w-auto">
        {innovative.map((item) => (
          <div data-aos="fade-left">
            <Card
              title={item.title}
              image={item.image}
              subtitles={item.subtitles}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Innovative;
