import { useState } from 'react';
import Title from '../components/Title';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronRight,
  faChevronDown,
} from '@fortawesome/free-solid-svg-icons';

const questions = [
  {
    title: 'Start by planning your data capturing mission',
    text: 'Hire one of our drone operators for professional data capturing services. Alternatively, capture the data yourself following our data-capture  instructions and industry standards.',
  },
  {
    title: 'Determine the types of defects you want to pinpoint',
    text: ' a. &nbsp; High altitude flights (40-45m, 130-150 feet) suitable for spotting issues like shading problems or complete string failures. <br/> b. &nbsp; Low altitude flights (20-25m, 65-82 feet) which are ideal for identifying issues such as faulty diodes, hot spots, cell level defects and micro cracks. Detailed analysis is super-charged with temperature data readings.  <br/> c. &nbsp; Consider both options - boost your field trips effectiveness by capturing data at both altitudes (highly recommended). This approach ensures an analysis that covers both scale and intricate issues.',
  },
  {
    title: 'Upload your data onto our Drospect Platform',
    text: 'Next, upload your data to our cloud-based platform. We ensure your data remain secure and will start processing them right away. Our team will reach out as soon as the data are processed (typically within 24 hours).',
  },
  {
    title: 'Obtain your map displaying unhealthy solar panels.',
    text: 'Our team will generate the map that pinpoints the position of faulty solar panels, including GPS coordinates, RGB and Thermal Image of each defect.',
  },
  {
    title: 'Organise your field trip',
    text: 'Utilise the map to schedule and prioritise maintenance tasks. We support a user friendly dashboard view of the map, which is accessible from any mobile browser.',
  },
];

export default function Technology() {
  const [open, setOpen] = useState(null);

  return (
    <div className=" py-10" id="howitworks">
      <div data-aos="fade-right">
        <Title title={'How It Works'} className={'pb-10'} />
      </div>
      <div
        data-aos="fade-right"
        className=" relative flex w-full p-2 justify-center h-full"
      >
        <div className=" w-1 bg-gradient-to-b  from-[#FF6B00] from-30% via-[#DD0077] via-50% to-[#7601F9] to-90% -mr-6"></div>

        <div data-aos="fade-left" className="w-full sm:w-1/2 cursor-pointer">
          {questions.map((el, i) => (
            <AccordionItem
              open={open}
              onOpen={setOpen}
              title={el.title}
              num={i + 1}
              key={el.title}
            >
              <p
                data-aos="fade-right"
                dangerouslySetInnerHTML={{ __html: el.text }}
              />
            </AccordionItem>
          ))}
        </div>
      </div>
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
      } flex justify-start w-full gap-5 sm:gap-10 py-4 px-18 items-center `}
      onClick={handleToggle}
    >
      <div
        className="flex justify-center items-top rounded-full text-white text-2xl text-center w-12 h-10"
        style={{
          border: '2px solid #0000',
          borderBottom: 'none',
          background:
            'linear-gradient(#222239,#352B53) padding-box, linear-gradient(to right, #FF6B00 0%, #DD0077 55%, #7000FF 100%) border-box',
        }}
      >
        {num}
      </div>
      <div
        className=" items-start py-4 w-full flex flex-col"
        style={{
          borderBottomWidth: '1px',
          borderTopStyle: 'solid',
          borderImageSlice: 1,
          borderImageSource:
            'linear-gradient(to right, #200C43, #511EA9, #200C43)',
        }}
      >
        <p className="title-questions flex justify-between text-white text-lg md:text-xl">
          {title}
          <p className="icon-questions text-white text-xl">
            {isOpen ? (
              <FontAwesomeIcon
                icon={faChevronDown}
                className="text-[#532FC5] text-base pl-5 "
              />
            ) : (
              <FontAwesomeIcon
                icon={faChevronRight}
                className="text-[#532FC5] text-base pl-5 items-center justify-center text-center flex"
              />
            )}
          </p>
        </p>

        {isOpen && (
          <div className="content-box-questions text-gray-400 pt-2 sm:pr-14 text-left pl-3 sm:pl-6">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
