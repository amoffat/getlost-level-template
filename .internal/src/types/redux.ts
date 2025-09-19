import { AppDispatch, RootState } from "@/store/store";
import { TypedStartListening } from "@reduxjs/toolkit";

export type AppStartListening = TypedStartListening<RootState, AppDispatch>;
