export class MapSize {
  width: u32 = 0;
  height: u32 = 0;
  tileWidth: u32 = 0;
  tileHeight: u32 = 0;

  toString(): string {
    return `MapSize(${this.width}, ${this.height}, ${this.tileWidth}, ${this.tileHeight})`;
  }
}
