import { createRoot } from "react-dom/client";
import { ShellApp } from "./components/ShellApp";
import { CommsProvider } from "./components/providers/CommsProvider";

createRoot(document.getElementById("root")!).render(
  <CommsProvider>
    <ShellApp />
  </CommsProvider>
);
