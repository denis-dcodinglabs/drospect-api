import { useState } from 'react';
import Title from '../components/Title';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronRight,
  faChevronDown,
} from '@fortawesome/free-solid-svg-icons';

const faqs = [
  {
    title: 'Why drones for solar park inspections? ',
    text: '- Drones and AI-powered analysis subsequently provide for far more accurate data capture and analysis. <br/> - Using drones reduces inspection time by up to 70% <br/> - Using drones reduces overall costs by up to 50% <br/> - Using drones reduces risk of accidental injuries <br/> - Using drones eases access to remote located solar parks',
  },
  {
    title: 'How accurate is the detection of faulty panels?',
    text: 'The accuracy of the model will highly depend on the quality of data captured. Assuming the data has been captured according to industry guidelines, we can guarantee models accuracy into the high 90s percentage.',
  },
  {
    title: 'Can it handle large solar parks?',
    text: ' Certainly! There are no limitations in terms of the size of the solar park. ',
  },
  {
    title: 'Is the technology easy to implement?',
    text: 'Short answer: Yes! Drone-based data capturing is a non-intrusive technology, meaning it does not interfere in any way with the operations of the solar park. This technology is also very easily scalable and is expected to become the industry standard.',
  },
  {
    title: 'When should I conduct drone-based operations?',
    text: 'The first inspection should take place right after the installation (within 1-2 weeks), so that you can ensure everything is working to its optimal level and that the installation was done right. After the first inspection, the following inspections are recommended: <br/> - Regular annual or semi-annual inspection. <br/> - Inspection prior to warranty expiring date. <br/> - Inspection for obtaining insurance coverage. <br/> - Inspection in post-severe weather events. <br/> - Pre-maintenance operations, as well as post-maintenance. <br/> - At any point when there are changes in output generated against expected output.',
  },
  {
    title:
      'Is the data captured during the drone inspection secure and private?',
    text: ' Yes, your data is secure and private. All inspection data is securely transferred to our cloud-based Drospect Platform. We adhere to industry standards and regulations to ensure confidentiality and protection against unauthorized access.',
  },
];

export default function FaqClient() {
  return (
    <div id="faq">
      <Accordion data={faqs} />
    </div>
  );
}

function Accordion({ data }) {
  const [open, setOpen] = useState(null);

  return (
    <div className="pt-10">
      <div data-aos="fade-right">
        <Title title={'Curious Minds'} description={'FAQ'} />
      </div>
      {data.map((el, i) => (
        <div data-aos="zoom-in-right">
          <AccordionItem
            open={open}
            onOpen={setOpen}
            title={el.title}
            num={i}
            key={el.title}
          >
            <p
              dangerouslySetInnerHTML={{ __html: el.text }}
              data-aos="fade-right"
            />
          </AccordionItem>
        </div>
      ))}
    </div>
  );
}

function AccordionItem({ num, title, open, onOpen, children }) {
  const isOpen = num === open;

  function handleToggle() {
    onOpen(isOpen ? null : num);
  }
  return (
    <div
      className={`item-questions ${
        isOpen ? 'open' : ''
      } flex flex-col justify-between py-4 sm:px-24 cursor-pointer`}
      onClick={handleToggle}
    >
      <div className=" items-center border-b border-[#41437A] pb-4">
        <p className="title-questions flex justify-between text-white  text-xl text-left">
          {title}
          <p className="icon-questions text-white text-2xl ">
            {isOpen ? (
              <FontAwesomeIcon icon={faChevronDown} className="text-gray-500" />
            ) : (
              <FontAwesomeIcon icon={faChevronRight} />
            )}
          </p>
        </p>

        {isOpen && (
          <div className="content-box-questions text-gray-400 pr-14">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
