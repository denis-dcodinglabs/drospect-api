// src/hooks/useRefreshToken.js
import { useCallback } from 'react';
import initializeAxios from '../axiosInstance';
import { useSelector } from 'react-redux';

const useRefreshToken = () => {
  const isImpersonating = useSelector(
    (state) => state.isAuthorizedReducer.isImpersonating,
  );
  const refreshToken = useCallback(async () => {
    try {
      await initializeAxios.refreshToken(isImpersonating);
    } catch (error) {
      console.error('Error refreshing token:', error);
    }
  }, [isImpersonating]);

  return refreshToken;
};

export default useRefreshToken;
