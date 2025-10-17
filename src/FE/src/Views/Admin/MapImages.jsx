import React, { useEffect, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import '../../assets/map/DJI_20240323212805_0066_T.JPG';
import axiosInstance from '../../axiosInstance';
import Button from '../../components/formComponents/Button';
import Loading from '../../components/Loading';
import Title from '../../components/Title';

const MapImages = () => {
  const [projects, setProjects] = useState([]);
  const [projectInView, setProjectInView] = useState();
  const [projectName, setProjectName] = useState();
  const [noProjects, setNoProjects] = useState(false);

  const [locationData, setLocationData] = useState({
    latitude: 42.492428305555556,
    longitude: 21.076345805555555,
  });
  const legalIcon = new Icon({
    iconUrl:
      'https://static.vecteezy.com/system/resources/previews/023/554/762/original/red-map-pointer-icon-on-a-transparent-background-free-png.png',
    iconSize: [35, 35], // size of the icon
    iconAnchor: [22, 22], // point of the icon which will correspond to marker's location
    popupAnchor: [0, -18], // point from which the popup should open relative to the iconAnchor
  });
  const unhealthyCoordinates = [
    {
      __filename: 'DJI_20240323212805_0066_T.JPG',
      latitude: 42.49280794444444,
      longitude: 21.076636444444443,
    },
    {
      __filename: 'DJI_20240323212949_0144_T.JPG',
      latitude: 42.49320425,
      longitude: 21.07604811111111,
    },
    {
      __filename: 'DJI_20240323213003_0154_T.JPG',
      latitude: 42.49319719444445,
      longitude: 21.07660497222222,
    },
    {
      __filename: 'DJI_20240323213241_0272_T.JPG',
      latitude: 42.49359916666667,
      longitude: 21.075337083333334,
    },
    {
      __filename: 'DJI_20240323212643_0005_T.JPG',
      latitude: 42.492428305555556,
      longitude: 21.076345805555555,
    },
    {
      __filename: 'DJI_20240323212745_0051_T.JPG',
      latitude: 42.49267752777778,
      longitude: 21.076847666666666,
    },
    {
      __filename: 'DJI_20240323212923_0124_T.JPG',
      latitude: 42.49307544444444,
      longitude: 21.076029277777778,
    },
    {
      __filename: 'DJI_20240323213030_0174_T.JPG',
      latitude: 42.49332302777778,
      longitude: 21.07674436111111,
    },
    {
      __filename: 'DJI_20240323213318_0299_T.JPG',
      latitude: 42.493713694444445,
      longitude: 21.076409833333333,
    },
    {
      __filename: 'DJI_20240323213654_0460_T.JPG',
      latitude: 42.49424030555556,
      longitude: 21.075372305555554,
    },
    {
      __filename: 'DJI_20240323213659_0464_T.JPG',
      latitude: 42.494237194444445,
      longitude: 21.075593972222222,
    },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axiosInstance.getData('/projects/me');
        if (res.length === 0) {
          setNoProjects(true);
        } else {
          setNoProjects(false);
          const lastProject = res[res.length - 1];
          setProjectInView(res[res.length - 1]);
          setLocationData({
            latitude: lastProject?.latitude,
            longitude: lastProject?.longitude,
          });
          setProjects(res);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (projectName) {
      const project = projects.filter(
        (project) => project.name === projectName,
      );
      setLocationData({
        latitude: project[0]?.latitude,
        longitude: project[0]?.longitude,
      });
      setProjectInView(project[0]);
    }
  }, [projects, projectName]);

  const showCoordination = () => {
    return unhealthyCoordinates.map((coordinate) => {
      return (
        <Marker
          position={[coordinate.latitude, coordinate.longitude]}
          icon={legalIcon}
        >
          <Popup>
            <img
              src={require('../../assets/map/' + coordinate.__filename)}
              alt="Point"
            />
            Image "{coordinate.__filename}" is Unhealthy
            <br />
            <a
              href={`https://maps.google.com/?q=${coordinate.latitude},${coordinate.longitude}`}
              target="_blank"
              rel="noreferrer"
            >
              See in Google Maps
            </a>
          </Popup>
        </Marker>
      );
    });
  };

  const ChangeMapView = ({ coords }) => {
    const map = useMap();
    map.setView(coords, 18);
    return null;
  };

  return (
    <div>
      <Title title={'Map'} className={'text-xl flex items-start pb-8'} />
      <div className="flex flex-wrap-reverse md:flex-row  md:flex-nowrap px-8 gap-4 md:gap-10 w-full h-full ">
        <div className=" w-full min-h-[320px]  md:w-2/3  ">
          <h1 className=" text-2xl md:text-3xl pb-2 md:pb-8">
            {projectInView?.name}
          </h1>
          {!noProjects && projects.length > 0 ? (
            <MapContainer
              center={[locationData?.latitude, locationData?.longitude]}
              zoom={18}
              scrollWheelZoom={true}
              className="w-full h-full"
            >
              <TileLayer
                url="https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                maxZoom={20}
                subdomains={['mt1', 'mt2', 'mt3']}
              />
              <ChangeMapView
                coords={[locationData?.latitude, locationData?.longitude]}
              />
              {showCoordination()}
            </MapContainer>
          ) : noProjects ? (
            <h1>Add projects to view Map</h1>
          ) : (
            <div className="w-full h-full flex justify-center items-center">
              <Loading />
            </div>
          )}
        </div>
        <div className="w-full md:w-1/3">
          <form
            className="flex flex-wrap gap-3 py-4 md:py-16"
            onSubmit={(e) => {
              e.preventDefault();
              setProjectName(e.target.projectInput.value);
              document.getElementById('projectInput').value = '';
            }}
          >
            <input
              list="projects"
              id="projectInput"
              name="projectInput"
              placeholder="Change project"
              className="p-2 border-none outline-none rounded-md bg-gray-700"
            />
            <datalist id="projects">
              {projects?.map((project) => (
                <option value={project.name} />
              ))}
            </datalist>
            <Button type="submit" text={'Change Project'} />
          </form>

          <div className="pr-4">
            <h1 className=" text-2xl  md:text-3xl pb-4 md:pb-8">
              Project Data
            </h1>
            {!noProjects && projects.length > 0 ? (
              <div className="flex flex-col gap-0.5 md:gap-2">
                <div className="flex justify-start items-start gap-2">
                  <h2 className="font-extrabold  text-colorSidebar">Name:</h2>
                  <p>{projectInView?.name}</p>
                </div>

                <div className="flex justify-start items-start gap-2">
                  <h2 className="font-extrabold text-colorSidebar">
                    Description:
                  </h2>
                  <p>{projectInView?.description}</p>
                </div>

                <div className="flex flex-wrap justify-start items-start gap-2">
                  <h2 className="font-extrabold text-colorSidebar">
                    Location:
                  </h2>
                  <p>{projectInView?.location}</p>
                </div>

                <div className="flex justify-start items-start gap-2">
                  <h2 className="font-extrabold text-colorSidebar">
                    Capacity:
                  </h2>
                  <p>{projectInView?.megawatt} megawatt</p>
                </div>
              </div>
            ) : noProjects ? (
              <h1>Add projects to view Data</h1>
            ) : (
              <Loading />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapImages;
