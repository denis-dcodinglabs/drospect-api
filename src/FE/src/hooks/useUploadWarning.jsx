import { useEffect } from 'react';

const useUploadWarning = (loadingFile) => {
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (loadingFile) {
        const message =
          'You have an ongoing upload. Are you sure you want to leave?';
        event.returnValue = message; // For legacy browsers
        return message; // For modern browsers
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [loadingFile]);
};

export default useUploadWarning;
