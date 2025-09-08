import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import { createRoot } from "react-dom/client";
import { Provider as ReduxProvider } from "react-redux";
import { ShellApp } from "./components/ShellApp";
import { CommsProvider } from "./components/providers/CommsProvider";
import { store } from "./store";

export default function App() {
  return (
    <ReduxProvider store={store}>
      <MantineProvider defaultColorScheme="dark">
        <CommsProvider>
          <ShellApp />
        </CommsProvider>
      </MantineProvider>
    </ReduxProvider>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
