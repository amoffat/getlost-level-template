import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/spotlight/styles.css";

import { CommsProvider } from "@/components/providers/CommsProvider";
import { router } from "@/router";
import { store } from "@/store/store";
import { MantineProvider, MantineThemeOverride } from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import { createRoot } from "react-dom/client";
import { Provider as ReduxProvider } from "react-redux";
import { RouterProvider } from "react-router-dom";
import ItemizedConfirmModal from "./components/modals/ItemizedConfirmModal";
import { overlayProps } from "./constants";

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
    Modal: {
      defaultProps: { overlayProps },
    },
    // Title: { defaultProps: { order: 3 } },
  },
};

const modals = {
  confirm: ItemizedConfirmModal,
};
declare module "@mantine/modals" {
  export interface MantineModalsOverride {
    modals: typeof modals;
  }
}

export default function App() {
  return (
    <ReduxProvider store={store}>
      <MantineProvider defaultColorScheme="dark" theme={theme}>
        <Notifications position="top-center" containerWidth={"40%"} />
        <ModalsProvider
          modals={modals}
          modalProps={{ overlayProps: overlayProps }}
        >
          <CommsProvider>
            <RouterProvider router={router} />
          </CommsProvider>
        </ModalsProvider>
      </MantineProvider>
    </ReduxProvider>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
