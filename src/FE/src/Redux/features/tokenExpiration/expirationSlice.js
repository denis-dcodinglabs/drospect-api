import { createSlice } from '@reduxjs/toolkit';
import jwt_decode from 'jwt-decode';

const storedToken = localStorage.getItem('token');

const tokenExpiration = storedToken
  ? new Date(jwt_decode(storedToken).exp * 1000) - new Date()
  : 0;

const initialState = {
  tokenExpiration: tokenExpiration,
};

const expirationSlice = createSlice({
  name: 'expiration',
  initialState,
  reducers: {
    setTokenExpiration: (state, action) => {
      state.tokenExpiration = action.payload;
    },
    removeTokenExpiration: (state) => {
      state.tokenExpiration = null;
    },
  },
});

export const { setTokenExpiration, removeTokenExpiration } =
  expirationSlice.actions;
export default expirationSlice.reducer;
