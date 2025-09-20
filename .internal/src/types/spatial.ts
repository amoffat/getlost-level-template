import RBush from "rbush";

export interface IndexItem {
  id: string;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export class SpatialIndex extends RBush<IndexItem> {}
