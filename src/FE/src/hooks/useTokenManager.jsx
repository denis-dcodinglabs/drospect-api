import { useState } from "react";
import {
  setIsImpersonating,
  setRole,
} from "../Redux/features/authorization/authorizationSlice";
import { useDispatch } from "react-redux";

const useTokenManager = () => {
  const dispatch = useDispatch();
  const [currentToken, setCurrentToken] = useState(
    localStorage.getItem("token"),
  );

  const setToken = (token) => {
    localStorage.setItem("token", token);
    setCurrentToken(token);
    dispatch(setRole());
  };

  const switchToken = (newToken) => {
    const adminToken = localStorage.getItem("adminToken");
    if (!adminToken) {
      localStorage.setItem("adminToken", currentToken);
      dispatch(setIsImpersonating(true));
    }
    setToken(newToken);
  };

  const revertToAdminToken = () => {
    const adminToken = localStorage.getItem("adminToken");
    if (adminToken) {
      setToken(adminToken);
      localStorage.removeItem("adminToken");
      dispatch(setIsImpersonating(false));
    }
  };

  return { currentToken, setToken, switchToken, revertToAdminToken };
};

export default useTokenManager;
