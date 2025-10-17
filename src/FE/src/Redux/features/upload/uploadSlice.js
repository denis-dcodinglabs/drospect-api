import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  uploads: {}, // Keyed by project ID
};

const uploadSlice = createSlice({
  name: "upload",
  initialState,
  reducers: {
    setUploadProgress: (state, action) => {
      const { projectId, progress, loading, totalFiles, isModal } =
        action.payload;
      state.uploads[projectId] = {
        progress,
        loading,
        totalFiles,
        isModal,
      };
    },
    clearUploadProgress: (state, action) => {
      const { projectId } = action.payload;
      delete state.uploads[projectId];
    },
  },
});

export const { setUploadProgress, clearUploadProgress } = uploadSlice.actions;
export default uploadSlice.reducer;
