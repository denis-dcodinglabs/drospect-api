import { createSlice } from "@reduxjs/toolkit";
const initialState = {
  user: {
    id: "",
    username: "",
    email: "",
    firstName: "",
    image: "",
    lastName: "",
    createdAt: "",
    updatedAt: "",
    isDeleted: false,
    userRoles: [],
  },
  wallet: {
    id: "",
    userId: "",
    credits: 0,
    createdAt: "",
    updatedAt: "",
  },
};
const usersDataSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
    },
    updateWallet: (state, action) => {
      state.wallet = { ...state.wallet, ...action.payload };
    },
  },
});
export const { updateUser, updateWallet } = usersDataSlice.actions;
export default usersDataSlice.reducer;
