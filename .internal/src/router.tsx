import { createBrowserRouter } from "react-router";
import { ShellApp } from "./components/ShellApp";

// ShellApp is the root layout for all routes. It reads useLocation() internally
// to determine which tab to render, so child routes need no element of their own.
const routes = [
  {
    path: "/",
    element: <ShellApp />,
    children: [
      { index: true, element: null },
      { path: "map", element: null },
      { path: "tilesets", element: null },
      { path: "tilesets/:tsid", element: null },
      { path: "tilesets/:tsid/objects/:objid", element: null },
      { path: "story", element: null },
      { path: "story/nodes/:nodeid", element: null },
      { path: "dialogues", element: null },
      { path: "dialogues/:dlgid", element: null },
      { path: "dialogues/:dlgid/nodes/:nodeid", element: null },
      { path: "preview", element: null },
    ],
  },
];

export const router = createBrowserRouter(routes);

// Accept HMR updates without recreating the router. I don't really understand
// why this fixes the issues with hotreloading, specifically the cached init
// promises in .internal/src/init/editorInit.ts becoming invalidated, but it
// does.
if (import.meta.hot) {
  import.meta.hot.accept("./components/ShellApp.tsx", () => {});
}
