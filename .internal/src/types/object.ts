export interface TileObject {
  // The grid size this object is aligned to
  gridSize: number;
  objectUrl: string;
  position: {
    x: number;
    y: number;
  };
}
