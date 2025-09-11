import BTree from "sorted-btree";
import { Vector } from "../vec";

export type ActiveLayer = "world" | "ground";

interface Vector3 extends Vector {
  z: number;
}

interface Tile {
  id: string;
  pos: Vector3;
}

export class LayerData {
  tiles: BTree<Vector3, Tile>;

  constructor() {
    this.tiles = new BTree(undefined, (a, b) => {
      if (a.y !== b.y) return a.y - b.y;
      if (a.x !== b.x) return a.x - b.x;
      if (a.z !== b.z) return a.z - b.z;
      return 0;
    });
  }
}
