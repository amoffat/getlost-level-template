import { ReactNode } from "react";
import { MapObjType, ZoneObj } from "./map";

export interface ZoneTypeMeta {
  slug: string;
  /** Pixi.js tint / fill color as a 24-bit hex number */
  color: number;
  /** CSS hex color string, e.g. "#ff3333" */
  cssColor: string;
  /** i18n key for the human-readable label */
  label: string;
  icon: ReactNode;
}

export type ZoneType = ZoneObj["type"];

export const zoneTypes: ZoneType[] = [
  MapObjType.CollisionZone,
  MapObjType.SinkZone,
  MapObjType.SoundZone,
  MapObjType.ZoomZone,
  MapObjType.SensorZone,
];

export type BrushShape = "square" | "circle";
export type PaintMode = "paint" | "erase";
