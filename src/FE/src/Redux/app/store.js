import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";
import expirationReducer from "../features/tokenExpiration/expirationSlice";

import isAuthorizedReducer from "../features/authorization/authorizationSlice";
import userReducer from "../features/user/userSlice";
import uploadReducer from "../features/upload/uploadSlice";

const rootReducer = combineReducers({
  expirationReducer,

  isAuthorizedReducer,
  userReducer,
  uploadReducer,
});

const persistConfig = {
  key: "root",
  storage,
  whitelist: ["isAuthorizedReducer", "userReducer"],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export const persistor = persistStore(store);
