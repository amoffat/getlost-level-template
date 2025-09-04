import React, { useState } from "react";
import { CommsContext } from "../../context/comms";
import { Comms } from "../../iframe";

export function CommsProvider({ children }: { children: React.ReactNode }) {
  const [comms, setComms] = useState<Comms | null>(null);

  return (
    <CommsContext.Provider value={{ comms, setComms }}>
      {children}
    </CommsContext.Provider>
  );
}
