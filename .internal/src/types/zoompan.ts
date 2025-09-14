import { Vector } from "../vec";

export type Zoom = number;
export type Pan = Vector;
export type ZoomPan = { zoom: Zoom; pan: Pan };
