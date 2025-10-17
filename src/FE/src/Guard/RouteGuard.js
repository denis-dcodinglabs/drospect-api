import React from 'react';
import { Navigate } from 'react-router-dom';
import jwt_decode from 'jwt-decode';

const RouteGuard = ({ component: Component, adminOnly, ...rest }) => {
  function hasJWT() {
    const token = localStorage.getItem('token');

    if (token) {
      let tokenData = jwt_decode(token);
      if (
        tokenData &&
        tokenData.exp &&
        new Date(tokenData.exp * 1000) < Date.now()
      ) {
        localStorage.removeItem('token');
        return 'login';
      } else if (adminOnly && tokenData.role !== 'ADMIN') {
        return 'client';
      }
      return 'admin';
    }
    return 'login';
  }

  const jwt = hasJWT();
  let componentToRender;

  if (jwt === 'admin') {
    componentToRender = <React.Fragment>{Component}</React.Fragment>;
  } else if (jwt === 'client') {
    componentToRender = <Navigate to={'/admin/projects'} />;
  } else {
    componentToRender = <Navigate to={'/admin/login'} />;
  }

  return componentToRender;
};

export default RouteGuard;
