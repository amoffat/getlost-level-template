import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import { createRoot } from "react-dom/client";
import { ShellApp } from "./components/ShellApp";
import { CommsProvider } from "./components/providers/CommsProvider";

export default function App() {
  return (
    <MantineProvider defaultColorScheme="dark">
      <CommsProvider>
        <ShellApp />
      </CommsProvider>
    </MantineProvider>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
