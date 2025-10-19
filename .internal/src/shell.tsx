import { MantineProvider, MantineThemeOverride } from "@mantine/core";
import "@mantine/core/styles.css";
import { createRoot } from "react-dom/client";
import { Provider as ReduxProvider } from "react-redux";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ShellApp } from "./components/ShellApp";
import { CommsProvider } from "./components/providers/CommsProvider";
import { store } from "./store/store";

const theme: MantineThemeOverride = {
  components: {
    // Container: { defaultProps: { p: "xs" } },
    // Paper: { defaultProps: { p: "xs" } },
    // Button: { defaultProps: { p: "xs" } },
    Stack: { defaultProps: { p: "xs" } },
    // Flex: { defaultProps: { gap: "xs" } },
    Dropzone: { defaultProps: { radius: 0 } },
    Fieldset: { defaultProps: { radius: 0 } },
    Tabs: { defaultProps: { radius: 0 } },
    // "Tabs.Panel": { defaultProps: { pt: "xs" } },
    // TextInput: { defaultProps: { size: "xs" } },
    // Textarea: { defaultProps: { size: "xs" } },
    // Switch: { defaultProps: { size: "xs" } },
    // Title: { defaultProps: { order: 3 } },
  },
};

const Router = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<ShellApp />} />
      <Route path="/map" element={<ShellApp />} />
      <Route path="/tilesets" element={<ShellApp />} />
      <Route path="/tilesets/:tsid" element={<ShellApp />} />
      <Route path="/npcs" element={<ShellApp />} />
      <Route path="/story" element={<ShellApp />} />
      <Route path="/dialogue" element={<ShellApp />} />
      <Route path="/preview" element={<ShellApp />} />
    </Routes>
  </BrowserRouter>
);

export default function App() {
  return (
    <ReduxProvider store={store}>
      <MantineProvider defaultColorScheme="dark" theme={theme}>
        <CommsProvider>
          <Router />
        </CommsProvider>
      </MantineProvider>
    </ReduxProvider>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
