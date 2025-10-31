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

// Create router with future flags for better HMR support
export const router = createBrowserRouter(routes);

// // Accept HMR updates without recreating the router
// if (import.meta.hot) {
//   import.meta.hot.accept("./components/ShellApp.tsx", () => {
//     // When ShellApp changes, React Router will automatically pick up the new component
//     // without needing to recreate the router instance
//   });
// }
