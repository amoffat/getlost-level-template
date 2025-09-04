import { createContext, useContext } from "react";
import { Comms } from "../iframe";
import { Setter } from "../types/react";

export const CommsContext = createContext<{
  comms: Comms | null;
  setComms: Setter<Comms | null>;
}>({
  comms: null,
  setComms: () => {},
});

export const useCommsContext = () => useContext(CommsContext);
