import React, { useState, useRef } from "react";
import SliderCard from "../components/SliderCard";
import { Swiper, SwiperSlide } from "swiper/react";
import { EffectCoverflow, Navigation } from "swiper/modules";
import Button from "../components/formComponents/Button";
import Arrow from "../assets/icons/ArrowButton";
import Title from "../components/Title";

// Import Swiper styles
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/effect-coverflow";

// image imports
import Solare from "../assets/Solare.png";
import Image_Three from "../assets/projects/image124.png";
import ProEnergy from "../assets/ProEnergy.png";

const Slider = () => {
  const projects = [
    {
      id: 1,
      image: Solare,
      title:
        "Drospect and Jaha Solar cooperate in piloting AI-Powered Drone Inspections",
    },
    {
      id: 2,
      image: Image_Three,
      title:
        "The Role of Artificial Intelligence and Drone-Based Data Capture in Solar Park Inspections",
    },
    {
      id: 3,
      image: ProEnergy,
      title: " How does our technology support solar park maintenance teams?",
    },
    {
      id: 1,
      image: Solare,
      title:
        "Drospect and Jaha Solar cooperate in piloting AI-Powered Drone Inspections",
    },
    {
      id: 2,
      image: Image_Three,
      title:
        "The Role of Artificial Intelligence and Drone-Based Data Capture in Solar Park Inspections",
    },
    {
      id: 3,
      image: ProEnergy,
      title: " How does our technology support solar park maintenance teams?",
    },
  ];

  const [activeIndex, setActiveIndex] = useState(0);
  const swiperRef = useRef(null);

  return (
    <div className="p-4 text-white relative" id="projects">
      <Title title={"Projects"} className={"pb-20"} />
      <Swiper
        onSwiper={(swiper) => (swiperRef.current = swiper)}
        modules={[EffectCoverflow, Navigation]}
        effect="coverflow"
        grabCursor={true}
        centeredSlides={true}
        coverflowEffect={{
          rotate: 45,
          stretch: 0,
          depth: 130,
          modifier: 1,
          slideShadows: true,
        }}
        spaceBetween={30}
        loop={true}
        slidesPerView={2}
        pagination={{ clickable: true }}
        scrollbar={{ draggable: true }}
        onSlideChange={({ realIndex }) => {
          setActiveIndex(realIndex);
        }}
        breakpoints={{
          0: {
            slidesPerView: 1,
            spaceBetween: 10,
          },
          640: {
            slidesPerView: 1,
            spaceBetween: 20,
          },
          768: {
            slidesPerView: 2,
            spaceBetween: 30,
          },
          1024: {
            slidesPerView: 3,
            spaceBetween: 50,
          },
        }}
      >
        {projects?.map((item, index) => (
          <SwiperSlide key={index}>
            <a href={"/projects/" + item.id}>
              <SliderCard
                title={item.title}
                active={activeIndex === index}
                img={item.image}
              />
            </a>
          </SwiperSlide>
        ))}
      </Swiper>
      <div className=" flex justify-center pt-8 gap-2 pb-28">
        <Button
          icon={<Arrow fillColor="white" width="14" height="24" />}
          className="rotate-180 rounded-full  pr-2.5 border-1"
          onClick={() => swiperRef.current?.slidePrev()}
        />
        <Button
          icon={<Arrow fillColor="white" width="14" height="24" />}
          className="rounded-full pr-2.5"
          onClick={() => swiperRef.current?.slideNext()}
        />
      </div>
    </div>
  );
};

export default Slider;
