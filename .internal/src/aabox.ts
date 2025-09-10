import {
  Graphics,
  Matrix,
  Point,
  Rectangle,
  StrokeInput,
  Transform,
} from "pixi.js";
import { Vec2, Vector } from "./vec";

// A Box is *always* axis-aligned. If you want something that can be rotated,
// look at Box. We store the coordinates as the upper-left corner (as position),
// and the lower right implicitly as width/height. This allows us to move the
// entire box by moving the upper-left corner.
export class AxisAlignedBox extends Transform {
  private _size: Vec2;

  private constructor(upperLeft: Vec2, lowerRight: Vec2) {
    super();
    this._size = lowerRight.subbed(upperLeft);
    this.position.set(upperLeft.x, upperLeft.y);
  }

  static fromPoints(upperLeft: Vec2, lowerRight: Vec2): AxisAlignedBox {
    return new AxisAlignedBox(upperLeft, lowerRight);
  }

  clone(): AxisAlignedBox {
    return AxisAlignedBox.fromWidthHeight(
      this.x,
      this.y,
      this.width,
      this.height
    );
  }

  static fromWidthHeight(
    x: number,
    y: number,
    width: number,
    height: number
  ): AxisAlignedBox {
    const upperLeft = new Vec2(x, y);
    const lowerRight = new Vec2(x + width, y + height);
    return new AxisAlignedBox(upperLeft, lowerRight);
  }

  /*
   * Constructs an AxisAlignedBox from an ImageData object. If a frame is
   * provided, only the pixels within the frame are considered. If no
   * non-transparent pixels are found, null is returned.
   *
   * @param imageData - The ImageData object to construct the AxisAlignedBox
   * from. @param frame - The frame to consider when constructing the
   * AxisAlignedBox. It is assumed that frame is *exclusive*, i.e. the
   * lower-right corner is not included in the frame.
   */
  static fromImageData(
    imageData: ImageData,
    frame?: AxisAlignedBox
  ): AxisAlignedBox | null {
    const { width, height, data } = imageData;

    // Initialize AABB bounds
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    let startX = 0;
    let endX = width;
    let startY = 0;
    let endY = height;

    if (frame) {
      const { position: upperLeft, lowerRight } = frame;

      startX = upperLeft.x;
      endX = lowerRight.x;
      startY = upperLeft.y;
      endY = lowerRight.y;
    }

    // Iterate through pixels to find non-transparent ones
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const index = (y * width + x) * 4; // Index in the data array
        const alpha = data[index + 3]; // Alpha channel

        // Ignore mostly transparent pixels
        if (alpha < 1) {
          continue;
        }

        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }

    // If no non-transparent pixels were found, return null
    if (maxX === -1 || maxY === -1) {
      return null;
    }

    // Construct and return the AxisAlignedBox
    return AxisAlignedBox.fromPoints(
      new Vec2(minX - startX, minY - startY),
      new Vec2(maxX - startX + 1, maxY - startY + 1)
    );
  }

  debugDraw(kw: {
    g: Graphics;
    stroke: StrokeInput;
    transform?: boolean;
  }): void {
    const { g, stroke } = kw;
    g.rect(this.x, this.y, this.width, this.height).stroke(stroke);
  }

  get area(): number {
    return this.width * this.height;
  }

  add(other: Vector): AxisAlignedBox {
    return new AxisAlignedBox(
      this.upperLeft.added(other),
      this.lowerRight.added(other)
    );
  }

  get x(): number {
    return this.position.x;
  }

  get y(): number {
    return this.position.y;
  }

  set width(value: number) {
    this._size.x = value;
  }

  set height(value: number) {
    this._size.y = value;
  }

  get width(): number {
    return this._size.x;
  }

  get height(): number {
    return this._size.y;
  }

  get size(): Vec2 {
    return this._size.clone();
  }

  // Expands the box to include the given point.
  public expandToContain(point: Vector) {
    const upperLeft = this.upperLeft;
    const lowerRight = this.lowerRight;

    if (point.x < upperLeft.x) {
      upperLeft.x = point.x;
    }
    if (point.y < upperLeft.y) {
      upperLeft.y = point.y;
    }
    if (point.x > lowerRight.x) {
      lowerRight.x = point.x;
    }
    if (point.y > lowerRight.y) {
      lowerRight.y = point.y;
    }

    this.position.set(upperLeft.x, upperLeft.y);
    this._size.set(lowerRight.x - upperLeft.x, lowerRight.y - upperLeft.y);
    return;
  }

  get upperLeft(): Vec2 {
    return new Vec2(this.position.x, this.position.y);
  }

  get lowerRight(): Vec2 {
    const lowerRight = this.matrix.apply(this._size);
    return Vec2.fromPoint(lowerRight);
  }

  // Replace field aliases with getter aliases
  get ul(): Vec2 {
    return this.upperLeft;
  }

  get br(): Vec2 {
    return this.lowerRight;
  }

  // For a given `other` bounding box, determine what amount of `other` is
  // overlapping with `this` bounding box.
  overlapArea(other: AxisAlignedBox): number {
    const xOverlap = Math.max(
      0,
      Math.min(this.lowerRight.x, other.lowerRight.x) -
        Math.max(this.position.x, other.position.x)
    );
    const yOverlap = Math.max(
      0,
      Math.min(this.lowerRight.y, other.lowerRight.y) -
        Math.max(this.position.y, other.position.y)
    );
    return xOverlap * yOverlap;
  }

  // If they overlap, or one contains the other, return true
  overlaps(other: AxisAlignedBox): boolean {
    return (
      this.position.x < other.lowerRight.x &&
      this.lowerRight.x > other.position.x &&
      this.position.y < other.lowerRight.y &&
      this.lowerRight.y > other.position.y
    );
  }

  contains(other: AxisAlignedBox): boolean {
    return (
      this.position.x <= other.position.x &&
      this.position.y <= other.position.y &&
      this.lowerRight.x >= other.lowerRight.x &&
      this.lowerRight.y >= other.lowerRight.y
    );
  }

  containsPoint(point: Vector): boolean {
    return (
      this.position.x <= point.x &&
      this.lowerRight.x >= point.x &&
      this.position.y <= point.y &&
      this.lowerRight.y >= point.y
    );
  }

  // Method to apply a transformation matrix to the rectangle. The final box is
  // axis-aligned, even if the transformation matrix is not.
  transformedBy(matrix: Matrix): AxisAlignedBox {
    // Define the corners of the rectangle
    const topLeft = this.upperLeft;
    const topRight = new Point(this.upperLeft.x + this.width, this.upperLeft.y);
    const bottomLeft = new Point(
      this.upperLeft.x,
      this.upperLeft.y + this.height
    );
    const bottomRight = this.lowerRight;

    // Apply the matrix transformation to each corner
    matrix.apply(topLeft, topLeft);
    matrix.apply(topRight, topRight);
    matrix.apply(bottomLeft, bottomLeft);
    matrix.apply(bottomRight, bottomRight);

    // Calculate new bounding box after transformation
    const minX = Math.min(topLeft.x, topRight.x, bottomLeft.x, bottomRight.x);
    const minY = Math.min(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y);
    const maxX = Math.max(topLeft.x, topRight.x, bottomLeft.x, bottomRight.x);
    const maxY = Math.max(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y);

    // Return a new transformed rectangle
    return AxisAlignedBox.fromWidthHeight(minX, minY, maxX - minX, maxY - minY);
  }

  raycast(origin: Vec2, direction: Vec2): Vec2[] | null {
    const upperLeft = this.position;
    const lowerRight = this.lowerRight;

    const invDir = {
      x: 1 / direction.x,
      y: 1 / direction.y,
    };

    // Find t values for intersection with box planes
    const t1 = (upperLeft.x - origin.x) * invDir.x;
    const t2 = (lowerRight.x - origin.x) * invDir.x;
    const t3 = (upperLeft.y - origin.y) * invDir.y;
    const t4 = (lowerRight.y - origin.y) * invDir.y;

    // Swap t1 and t2 if necessary
    const tMinX = Math.min(t1, t2);
    const tMaxX = Math.max(t1, t2);

    // Swap t3 and t4 if necessary
    const tMinY = Math.min(t3, t4);
    const tMaxY = Math.max(t3, t4);

    // Calculate the overall tMin and tMax
    const tMin = Math.max(tMinX, tMinY);
    const tMax = Math.min(tMaxX, tMaxY);

    // If tMax < tMin, the ray misses the box
    if (tMax < tMin || tMax < 0) {
      return null;
    }

    const intersections: Vec2[] = [];
    if (tMin >= 0) {
      intersections.push(origin.added(direction.scaled(tMin)));
    }
    if (tMax >= 0) {
      intersections.push(origin.added(direction.scaled(tMax)));
    }

    return intersections.length > 0 ? intersections : null;
  }

  get center(): Vec2 {
    return Vec2.fromPoint(this.position).added(this.size.scaled(0.5));
  }

  toString(): string {
    const pos = Vec2.fromPoint(this.position);
    return `AABox(${pos.toString()}, ${this.width}, ${this.height})`;
  }

  get rect(): Rectangle {
    return new Rectangle(
      this.position.x,
      this.position.y,
      this.width,
      this.height
    );
  }
}
