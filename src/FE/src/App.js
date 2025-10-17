import { Routes } from "./routes/index";
import "./App.css";
import { useSelector } from "react-redux";
import { useEffect } from "react";
import axiosInstance from "./axiosInstance";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AOS from "aos";
import "aos/dist/aos.css";

function App() {
  const tokenExpiration = useSelector(
    (state) => state.expirationReducer.tokenExpiration,
  );
  const isAuthorized = useSelector(
    (state) => state.isAuthorizedReducer.isAuthorized,
  );
  useEffect(() => {
    if (tokenExpiration) {
      setTimeout(() => {
        axiosInstance.logout();
        window.location.href = "";
      }, tokenExpiration);
    }
  }, [tokenExpiration]);

  useEffect(() => {
    AOS.init({
      duration: 1000, // Animation duration in milliseconds
      offset: 200, // Offset value in pixels to trigger the animation
    });
  }, []);

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      <Routes isAuthorized={isAuthorized} />
    </>
  );
}

export default App;
