import { createBrowserRouter } from "react-router";
import { ShellApp } from "./components/ShellApp";

export const router = createBrowserRouter([
  { path: "/", element: <ShellApp /> },
  { path: "/map", element: <ShellApp /> },
  { path: "/tilesets", element: <ShellApp /> },
  { path: "/tilesets/:tsid", element: <ShellApp /> },
  { path: "/npcs", element: <ShellApp /> },
  { path: "/story", element: <ShellApp /> },
  { path: "/dialogue", element: <ShellApp /> },
  { path: "/preview", element: <ShellApp /> },
]);
