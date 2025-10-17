import React from "react";
import Diedon from "../assets/Diedon-.png";
import Meti from "../assets/MetiLatifi.png";
import Denis from "../assets/Denis.png";
import Nedim from "../assets/Nedim.png";
import SliderCard from "../components/SliderCard";
import Title from "../components/Title";

const Team = () => {
  const team = [
    {
      image: Diedon,
      title: "Diedon Statovci - Co-Founder, Co-CEO and CTO",
      subtitles: "Software engineer and entrepreneur.",
    },
    {
      image: Meti,
      title: "Meti Latifi - Co-Founder, Co-CEO and CIO ",
      subtitles: "Energy innovation consultant and researcher. ",
    },
    {
      image: Denis,
      title: "Denis Krasniqi - Software Engineer, DevOps",
      subtitles: "Backend engineer and cloud platform specialist.",
    },
    {
      image: Nedim,
      title: "Nedim Faiku - Lead Software Engineer",
      subtitles: "Full stack engineer and software specialist.",
    },
  ];
  return (
    <div id="team">
      <div data-aos="zoom-in">
        <Title title={"Meet the Team"} className={"pb-10 pt-20"} />
      </div>
      <div className="flex items-center justify-center flex-wrap gap-8 p-4 sm:p-10">
        {team.map((item, index) => (
          <SliderCard
            title={item.title}
            active={true}
            hover={true}
            className="w-full sm:w-2/5 xl:w-1/3 xl:pt-2 h-[400px] text-left bg-[#9A9BD3]"
            img={item.image}
            subtitle={item.subtitles}
          />
        ))}
      </div>
    </div>
  );
};

export default Team;
