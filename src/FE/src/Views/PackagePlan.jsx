import React from "react";
import Title from "../components/Title";
import Button from "../components/formComponents/Button";
import Checkbox from "../assets/icons/Checkbox";
import { useNavigate } from "react-router-dom";

const PricingPlan = () => {
  const cardData = [
    {
      title: "Starter",
      description: "Precision drone inspections for smaller solar parks.",
      megaWatt: "0-3 MW",
      color: "text-[#DE8B63]",
      paragraph: [
        "Low Altitude Flight:	35 €/MW",
        "High Altitude Flight: 25 €/MW",
      ],
    },
    {
      title: "Pro",
      description: "Optimize mid-sized solar farms with advanced monitoring.",
      megaWatt: "3-10 MW",
      color: "text-[#BE3976]",
      paragraph: [
        "Low Altitude Flight:	30 €/MW",
        "High Altitude Flight: 20 €/MW",
      ],
    },
    {
      title: "Ultimate",
      description: "Custom drone solutions for large-scale solar efficiency",
      megaWatt: "11+ MW",
      color: "text-[#7601F9]",
      paragraph: [
        "Low Altitude Flight:	Let’s talk",
        "High Altitude Flight:	Let’s talk",
      ],
    },
  ];
  const navigate = useNavigate();

  const Card = ({ title, description, megaWatt, paragraph, className }) => {
    const borderLineStyle = {
      border: "2px solid #0000",
      borderBottom: "none",
      borderBottomRightRadius: 0,
      background:
        "linear-gradient(#150C2A,#150C2A) padding-box, linear-gradient(to bottom, #FF6B00, #7000FF, #100B20)  border-box",
    };

    return (
      <div
        className="flex flex-col justify-center items-center py-7 md:pt-20 md:pb-16 w-[405px] rounded-3xl z-10"
        style={borderLineStyle}
      >
        <div className="flex flex-col justify-center  text-white px-8">
          <h1 className={`text-3xl md:text-4xl pb-5 ${className}`}>{title}</h1>
          <p className="text-base md:text-xl text-[#C1C1C1] pb-4">
            {description}
          </p>
          <h1 className={`text-2xl md:text-5xl  font-bold pb-4 ${className}`}>
            {megaWatt}
          </h1>
          <Button
            text={"Get Started"}
            onClick={() => navigate("/#contact")}
            className={"rounded-lg h-14 text-lg items-center flex"}
            style={{
              background: "linear-gradient(#212237,#212237)",
            }}
          />
          <ul className="pt-8">
            {paragraph.map((item) => (
              <li className="text-base flex justify-center items-center text-[#C1C1C1] pb-4">
                <Checkbox /> &nbsp; {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  };
  return (
    <div className="">
      <Title
        title={"Choose your plan"}
        description={"Unlock endless possibilities"}
        className={"py-4 text-5xl "}
        classNameDescription={"text-2xl pb-20"}
      />
      <div className="flex justify-center gap-10 flex-wrap mb-40 w-full">
        {cardData.map((item) => (
          <Card
            title={item.title}
            description={item.description}
            megaWatt={item.megaWatt}
            paragraph={item.paragraph}
            className={item.color}
          />
        ))}
      </div>
    </div>
  );
};

export default PricingPlan;
