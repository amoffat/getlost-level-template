import { MilestoneWaypoint } from "@/slices/story";
import { createContext, useContext } from "react";

interface WaypointModalContextValue {
  openWaypointModal: (
    nodeId: string,
    waypoint: MilestoneWaypoint | null,
  ) => void;
}

const defaultValue: WaypointModalContextValue = {
  openWaypointModal: () => {},
};

export const WaypointModalContext =
  createContext<WaypointModalContextValue>(defaultValue);

export function useWaypointModal() {
  return useContext(WaypointModalContext);
}
