import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';

import ProjectsPhoto from '../assets/ProjectsPhoto.png';
import JahaSolarLogo from '../assets/JahaSolarLogo.png';
import howDoes from '../assets/howDoes.png';
import howDoes1 from '../assets/howDoes1.png';
import RoleAi from '../assets/RoleAi.png';
import RoleAi1 from '../assets/RoleAi1.png';
import Logo from '../assets/icons/Logo';
import Title from '../components/Title';
import Solare from '../assets/Solare.png';
import ProEnergy from '../assets/ProEnergy.png';

import { useParams } from 'react-router-dom';

const projects = [
  {
    id: '1',
    type: 'project',
    title:
      ' Drospect and Jaha Solar cooperate in piloting AI-Powered Drone Inspections',
    subtitle: 'Project Summary',
    blogDescription:
      'Drospect and Jaha Solar have successfully completed a groundbreaking pilot project utilizing drone-based and AI-powered technology developed by Drospect to inspect the 3 MWp solar park in Lipjan, Kosovo. This innovative approach has significantly enhanced the identification and analysis of malfunctioning solar panels, ensuring optimal performance and efficiency.',
    backgroundPhoto: ProjectsPhoto,
    logo: JahaSolarLogo,
    firstParagraph: [
      <p className="pb-8 text-xl text-left">
        Drospect and Jaha Solar have successfully completed a groundbreaking
        pilot project utilizing drone-based and AI-powered technology developed
        by Drospect to inspect the 3 MWp solar park in Lipjan, Kosovo. This
        innovative approach has significantly enhanced the identification and
        analysis of malfunctioning solar panels, ensuring optimal performance
        and efficiency.
      </p>,
      <p className="pb-8 text-xl text-left">
        With an installed capacity of 3 MWp, spanning over 4 hectares and
        comprising 5,552 solar panels, the ProEnergy park is a significant
        investment by ProCredit Bank and ProCredit Holding towards their
        net-zero goals. Ensuring the optimal performance of such a large-scale
        installation is critical for maximizing return on investment and
        contributing to sustainable energy goals. Traditionally, manual
        inspections of solar panels have been labor-intensive and
        time-consuming, often failing to detect subtle defects that can impact
        performance.
      </p>,
    ],
    image: Solare,
    secondImage: ProEnergy,
    secondParagraph: [
      <h2 className="text-3xl  py-4 text-white">Results</h2>,
      <p className="pb-4 text-xl text-left">
        Prior to the inspection, the operator of the ProEnergy park was aware of
        one physically damaged solar panel. However, the detailed inspection
        conducted by Drospect`s drones uncovered a total of 11 panels that were
        not performing optimally. The identified defects ranged from
        open-circuit substrings and hotspots to broken panels. This level of
        detailed and accurate detection is a testament to the effectiveness of
        combining drone technology with AI-powered data processing.
      </p>,
      <p className="pb-4 text-xl text-left">
        In conclusion, the Drospect and Jaha Solar collaboration has
        demonstrated the transformative impact of integrating drones and AI in
        solar panel inspections. This pilot project at the ProEnergy park is a
        significant step forward in ensuring the reliability and efficiency of
        solar energy installations, paving the way for future innovations in the
        industry.
      </p>,
      <p className="text-xl text-left italic">
        If you are an owner or operator of on-ground or rooftop solar energy
        assets, reach out to us and enable a new level of efficiency into
        operations and maintenance of your assets.
      </p>,
    ],
  },

  {
    id: '2',
    type: 'blog',
    backgroundPhoto: RoleAi,
    title:
      'The Role of Artificial Intelligence and Drone-Based Data Capture in Solar Park Inspections',
    blogDescription:
      'As the world shifts towards sustainable energy, the efficiency and maintenance of renewable energy infrastructure have become critical. Among these, solar parks stand out due to their expansive nature and the necessity for regular inspections to ensure optimal performance. Traditionally, these inspections were labor-intensive and time-consuming, but the advent of drones and artificial intelligence (AI) has revolutionized this process, significantly enhancing efficiency and reducing costs.',

    secondImage: RoleAi1,
    firstParagraph: [
      <h2 className="text-2xl  py-4 text-white">
        Emergence of Drones in Energy Infrastructure
      </h2>,
      <p>
        Drones have rapidly become indispensable tools in the energy sector,
        including for the inspection of solar parks. These unmanned aerial
        vehicles (UAVs) offer a myriad of advantages over traditional methods.
        They can access hard-to-reach areas without risking human safety,
        provide high-resolution imagery, and carry sensors such as thermal
        cameras to detect issues invisible to the naked eye. This capability
        allows for a comprehensive assessment of solar panels, identifying
        defects like micro-cracks, dirt accumulation, and hotspots efficiently.
      </p>,
      <p className="py-4">
        In wind energy, drones have been used to inspect turbine blades,
        detecting 98% of blade damage in a single flight, compared to the 30%
        accuracy of traditional rope access methods. Similar benefits apply to
        solar panel inspections, where drones reduce inspection times from days
        to hours, significantly boosting productivity and safety.
      </p>,
      <h2 className="text-2xl py-4 text-white">Cost and Time Efficiency</h2>,
      <p>
        The integration of drones and AI in solar park inspections results in
        substantial cost and time savings. According to various industry
        reports, using drones can reduce inspection costs by up to 50%. For
        instance, deploying drones eliminates the need for extensive manual
        labor and the associated risks and expenses. The ability of drones to
        quickly capture and process data through AI further accelerates the
        inspection process, reducing the time required by approximately 70%.
      </p>,
    ],
    secondParagraph: [
      <h2 className="text-2xl py-4 text-white">
        Enhanced Data Analysis with AI
      </h2>,
      <p>
        AI plays a pivotal role in processing the vast amounts of data captured
        by drones. Advanced algorithms analyze high-resolution images and
        thermal data to detect anomalies, classify them by severity, and predict
        potential failures. This proactive approach enables maintenance teams to
        prioritize repairs and schedule interventions more effectively,
        minimizing downtime and maximizing the efficiency of solar parks.
      </p>,
      <p className="py-4">
        For example, drones equipped with infrared (IR) cameras can perform
        thermal inspections to identify sub-module hotspots that might be missed
        during manual inspections. Once data are collected it is then uploaded
        in our Drospect Platform into an interactive web map, providing
        maintenance personnel with actionable insights in real-time.
      </p>,
      <h2 className="text-2xl py-4 text-white">
        Broader Impact and Future Prospects
      </h2>,
      <p>
        The use of drones and AI in solar park inspections is part of a broader
        trend of integrating advanced technologies into energy infrastructure.
        Beyond cost and time savings, these technologies improve safety by
        reducing the need for human inspectors to operate in hazardous
        conditions. They also enhance the accuracy and comprehensiveness of
        inspections, leading to better asset management and longer lifespans for
        solar installations.
      </p>,
      <p className="py-4">
        As regulations evolve and technology advances, the use of drones is
        expected to become even more widespread. The recent Drone Infrastructure
        Inspection Grant (DIIG) Act of 2023, for instance, has made it easier
        for companies to adopt drone technology by providing grants for
        purchasing drones and training employees.
      </p>,
      <p className="py-4">
        In conclusion, the combination of drones and AI is transforming the
        inspection and maintenance of solar parks, driving down costs, speeding
        up processes, and enhancing safety and accuracy. As these technologies
        continue to evolve, they will play an increasingly vital role in the
        sustainable management of renewable energy resources.
      </p>,
      <p className="italic py-4">
        If you’re interested in learning more about how our drone and AI-powered
        services can revolutionize your solar park inspections and maintenance,
        contact us today. Discover how our advanced technology solutions can
        significantly enhance your operational efficiency and reduce costs.
      </p>,
    ],
  },
  {
    id: '3',
    type: 'blog',
    backgroundPhoto: howDoes,
    title: 'How does our technology support solar park maintenance teams?',
    blogDescription:
      'The integration of drone technology and artificial intelligence (AI) in the inspection and maintenance of solar parks has transformed the renewable energy landscape. One of the most innovative applications that Drospect has developed is the creation of detailed maps that pinpoint anomalies in solar panels. Maintenance teams can now use these maps to efficiently address issues, enhancing both productivity and accuracy in maintaining solar parks.',
    secondImage: howDoes1,
    firstParagraph: [
      <h2 className="text-2xl py-4 text-white">
        How It Works: From Drone Capture to AI Analysis
      </h2>,
      <p>
        Drones equipped with high-resolution RGB and thermal cameras fly over
        solar parks, capturing detailed images of the panels. These images are
        then processed by AI algorithms that detect anomalies such as
        micro-cracks, hotspots, and vegetation. The data is compiled into an
        interactive map, accessible through various digital devices. <br />
        This map is more than just a static image; it is an interactive tool
        that maintenance teams use to navigate the complex landscape of solar
        parks. Each pinpoint on the map represents an identified anomaly,
        providing a wealth of information with a simple click.
      </p>,
    ],
    secondParagraph: [
      <h2 className="text-2xl  py-4 text-white">
        Key Features of the Interactive Maintenance Map
      </h2>,
      <h3 className="text-xl md:pl-5 py-4 text-white">
        Detailed Anomaly Information:
      </h3>,
      <p className="md:pl-5 py-4">
        <span className="font-bold">RGB and Thermal Images: </span> Clicking on
        a pinpoint reveals both the RGB and thermal images of the affected
        panel, allowing maintenance teams to understand the nature and severity
        of the issue.
      </p>,
      <p className="md:pl-5 py-4 ">
        GPS Coordinates: Each pinpoint includes GPS coordinates with a clickable
        link that opens the location in Google Maps. This feature ensures that
        maintenance teams can easily locate the exact position of the anomaly.
      </p>,

      <h3 className="text-xl md:pl-5 py-4 text-white">
        Interactive and Dynamic Pinpoints:
      </h3>,
      <p className=" md:pl-5 py-4">
        Review Confirmation: After addressing an anomaly, maintenance personnel
        can mark it as reviewed. This action turns the pinpoint green, providing
        a clear visual indication of the panels that have been checked and those
        that still require attention.
      </p>,
      <p className="md:pl-5 py-4">
        Comment Box: A comment box is available for maintenance teams to provide
        details on the work performed. This feature helps in maintaining a
        comprehensive record of the interventions made, which can be crucial for
        future reference and audits.
      </p>,
      <h3 className=" text-xl md:pl-5 py-4 text-white">
        Efficiency and Accuracy in Maintenance:
      </h3>,
      <p className=" md:pl-5 py-4">
        Prioritized Maintenance: By visualizing the anomalies on a map,
        maintenance teams can prioritize their tasks based on the severity and
        location of the issues. This targeted approach minimizes downtime and
        ensures that the most critical problems are addressed promptly.
      </p>,
      <p className=" md:pl-5 py-4">
        Historical Data Tracking: The map retains historical data of past
        inspections and maintenance activities, allowing for trend analysis and
        proactive maintenance strategies.
      </p>,
      <p className="md:pl-5 py-4">
        The use of these interactive maps is proving to be a game-changer for
        companies operating large solar parks. Future developments will
        incorporate augmented reality (AR) features to guide maintenance teams
        on-site in real-time.
      </p>,
      <p className="pb-4 pt-10">
        If you’re interested in learning more about how our drone and AI-powered
        services can revolutionize your solar park inspections and maintenance,
        contact us today. Discover how our advanced technology solutions can
        significantly enhance your operational efficiency and reduce costs.
      </p>,
    ],
  },
];
const Projects = () => {
  const { id } = useParams();
  const [data, setData] = useState([]);

  useEffect(() => {
    setData(projects.filter((item) => item.id === id)[0]);
  }, [id]);
  if (!data) {
    return null;
  }
  return (
    <div className="text-white p-2 md:p-20 flex flex-col items-center justify-center">
      <Helmet>
        <title>{data?.title}</title>
        <meta name="description" content={data?.blogDescription} />
        <link rel="canonical" href={`https://www.drospect.ai/projects/${id}`} />
      </Helmet>
      <div className="relative  h-[404px] md:h-[604px] overflow-hidden rounded-3xl">
        <div className="absolute w-full h-full flex flex-col justify-center">
          <div className="flex flex-col justify-center md:gap-28 items-center h-auto">
            <div className="flex-col md:flex pb-12 md:pb-8 w-32 md:w-52">
              <Logo width="100%" />
              {data.logo && (
                <img
                  src={data?.logo}
                  alt="JahaSolarLogo"
                  className=" md:pl-4 w-full"
                />
              )}
            </div>

            <div className="flex justify-center items-center h-10">
              <h1 className="text-[#D1D1D1] md:pt-22 text-2xl md:text-5xl md:w-[80%] font-extrabold">
                {data?.title}
              </h1>
            </div>
          </div>
        </div>
        <img
          src={data?.backgroundPhoto}
          alt=" ProjectsPhoto"
          className="rounded-3xl"
        />
      </div>
      <div className="flex-col md:flex justify-around items-center">
        <div
          className={
            data.type === 'project' ? 'md:py-10 w-[100%]' : 'md:py-10 w-[100%]'
          }
        >
          <Title
            title={<h1 className="text-left pb-2">{data?.subtitle}</h1>}
            description={
              <p className="text-lg md:text-xl text-[#D1D1D1] text-left">
                {data?.blogDescription}
              </p>
            }
          />
          {data.type === 'project' && (
            <img
              src={data.image}
              alt="SolarPhoto"
              className="md:w-[25%] md:float-right lg:pl-6 py-6"
            />
          )}
          {data?.firstParagraph?.map((item, i) => (
            <div
              key={i}
              className="text-lg md:text-xl text-[#D1D1D1] text-left pt-8"
            >
              {item}
            </div>
          ))}
        </div>
      </div>

      <div
        className={
          data.type === 'project'
            ? 'flex items-start justify-start'
            : 'flex items-center justify-center'
        }
      >
        <div className="py-10 w-full">
          <img
            src={data.secondImage}
            alt="ProEnergy"
            className="w-[90%] md:w-[40%] px-6  md:py-6 flex md:float-right"
          />
          {data?.secondParagraph?.map((item, i) => (
            <p key={i} className="text-lg md:text-xl text-[#D1D1D1] text-left">
              {item}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Projects;
