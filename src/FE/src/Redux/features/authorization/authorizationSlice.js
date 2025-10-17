import { createSlice } from '@reduxjs/toolkit';
import jwt_decode from 'jwt-decode';

const storedToken = localStorage.getItem('token');

const checkTokenExpiration = () => {
  const tokenExpiration = storedToken
    ? new Date(jwt_decode(storedToken).exp * 1000) - new Date()
    : 0;
  return tokenExpiration;
};

const initialState = {
  isAuthorized: storedToken && checkTokenExpiration() > 0 ? true : false,
  isImpersonating: localStorage.getItem('adminToken') ? true : false,
  role:
    localStorage.getItem('token') &&
    jwt_decode(localStorage.getItem('token')).roles[0],
};

const authorizationSlice = createSlice({
  name: 'authorization',
  initialState,
  reducers: {
    setIsAuthorized: (state, action) => {
      state.isAuthorized = action.payload;
    },
    setIsImpersonating: (state, action) => {
      state.isImpersonating = action.payload;
    },
    setRole: (state) => {
      state.role =
        localStorage.getItem('token') &&
        jwt_decode(localStorage.getItem('token')).roles[0];
    },
  },
});

export const { setIsAuthorized, setIsImpersonating, setRole } =
  authorizationSlice.actions;
export default authorizationSlice.reducer;
