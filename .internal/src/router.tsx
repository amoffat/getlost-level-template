import { createBrowserRouter } from "react-router";
import { ShellApp } from "./components/ShellApp";

// Create the router routes configuration
const routes = [
  { path: "/", element: <ShellApp /> },
  { path: "/map", element: <ShellApp /> },
  { path: "/tilesets", element: <ShellApp /> },
  { path: "/tilesets/:tsid", element: <ShellApp /> },
  { path: "/npcs", element: <ShellApp /> },
  { path: "/story", element: <ShellApp /> },
  { path: "/dialogue", element: <ShellApp /> },
  { path: "/preview", element: <ShellApp /> },
];

export const router = createBrowserRouter(routes);

// Accept HMR updates without recreating the router. I don't really understand
// why this fixes the issues with hotreloading, specifically the cached init
// promises in .internal/src/init/editorInit.ts becoming invalidated, but it
// does.
if (import.meta.hot) {
  import.meta.hot.accept("./components/ShellApp.tsx", () => {});
}
