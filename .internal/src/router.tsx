import { createBrowserRouter } from "react-router";
import { ShellApp } from "./components/ShellApp";

// ShellApp is the root layout for all routes. It reads useLocation() internally
// to determine which tab to render, so child routes need no element of their own.
const routes = [
  {
    path: "/",
    element: <ShellApp />,
    children: [
      { index: true },
      { path: "map" },
      { path: "tilesets" },
      { path: "tilesets/:tsid" },
      { path: "tilesets/:tsid/objects/:objid" },
      { path: "story" },
      { path: "story/nodes/:nodeid" },
      { path: "dialogues" },
      { path: "dialogues/:dlgid" },
      { path: "dialogues/:dlgid/milestones/:milestone" },
      { path: "dialogues/:dlgid/milestones/:milestone/nodes/:nodeid" },
      { path: "preview" },
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
