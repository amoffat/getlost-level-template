import * as camera from "../api/w2h/camera";
import * as particles from "../api/w2h/particles";
import { Vec2 } from "./la/vec2";

const numComponents: u32 = 4;
const componentSize: u32 = sizeof<f32>() as u32;
const elementSize: u32 = numComponents * componentSize;

class Bounds {
  upperLeft: Vec2;
  lowerRight: Vec2;

  constructor(upperLeft: Vec2, lowerRight: Vec2) {
    this.upperLeft = upperLeft;
    this.lowerRight = lowerRight;
  }
}

export class ParticleSystem {
  protected _ptr: usize;
  num: u32;
  velocities: StaticArray<Vec2>;
  protected _cameraFrame: Bounds = new Bounds(new Vec2(0, 0), new Vec2(0, 0));
  protected _offScreenPadding: f32 = 10;

  constructor(tileset: string, tileidx: u32, num: u32) {
    this.num = num;
    this.velocities = new StaticArray<Vec2>(num);

    this._syncCameraFrame();

    // Each particle has 4 floats: x, y, sx, sy
    const bufferSize: usize = num * elementSize;

    this._ptr = heap.alloc(bufferSize);

    for (let i: u32 = 0; i < num; i++) {
      this.velocities[i] = new Vec2(0, 0);
    }

    for (let i: u32 = 0; i < num; i++) {
      const pos = this._getInitPosition(i);
      this.updatePosition(i, pos[0], pos[1]);
      this.updateScale(i, 1, 1);
    }

    particles.create(this._ptr, tileset, tileidx, num);
  }

  // Override this method to provide a custom initial position
  protected _getInitPosition(i: u32): StaticArray<f32> {
    return [0, 0];
  }

  destroy(): void {
    heap.free(this._ptr);
  }

  updatePosition(index: u32, x: f32, y: f32): void {
    store<f32>(this._ptr + index * elementSize, x);
    store<f32>(this._ptr + index * elementSize + componentSize, y);
  }

  updateScale(index: u32, sx: f32, sy: f32): void {
    store<f32>(this._ptr + index * elementSize + 2 * componentSize, sx);
    store<f32>(this._ptr + index * elementSize + 3 * componentSize, sy);
  }

  isOffScreen(x: f32, y: f32): bool {
    const ulx = this._cameraFrame.upperLeft.x - this._offScreenPadding;
    const uly = this._cameraFrame.upperLeft.y - this._offScreenPadding;
    const lrx = this._cameraFrame.lowerRight.x + this._offScreenPadding;
    const lry = this._cameraFrame.lowerRight.y + this._offScreenPadding;
    return x < ulx || x > lrx || y < uly || y > lry;
  }

  protected _syncCameraFrame(): void {
    const frame = camera.getFrame();
    this._cameraFrame.upperLeft.x = frame[0];
    this._cameraFrame.upperLeft.y = frame[1];
    this._cameraFrame.lowerRight.x = frame[2];
    this._cameraFrame.lowerRight.y = frame[3];
  }

  protected _getResetPosition(index: u32, x: f32, y: f32): StaticArray<f32> {
    return this._getInitPosition(index);
  }

  // Progress the particles by their velocities
  tick(deltaMs: f32): void {
    this._syncCameraFrame();

    for (let i: u32 = 0; i < this.num; i++) {
      const x = load<f32>(this._ptr + i * elementSize);
      const y = load<f32>(this._ptr + i * elementSize + componentSize);

      const vel = this.velocities[i];
      const deltaPosX = (vel.x * deltaMs) / 1000;
      const deltaPosY = (vel.y * deltaMs) / 1000;

      let newX = x + deltaPosX;
      let newY = y + deltaPosY;

      if (this.isOffScreen(newX, newY)) {
        const resetPos = this._getResetPosition(i, newX, newY);
        newX = resetPos[0];
        newY = resetPos[1];
      }

      this.updatePosition(i, newX, newY);
    }
  }
}

export class SnowParticles extends ParticleSystem {
  // Units per second
  winds: StaticArray<Vec2>;
  private _turbulence: f32;
  private _dampening: f32;

  constructor(
    tileset: string,
    tileidx: u32,
    num: u32,
    turbulence: f32 = 200,
    dampening: f32 = 0.98
  ) {
    super(tileset, tileidx, num);

    this.winds = new StaticArray<Vec2>(num);
    this._turbulence = turbulence;
    this._dampening = dampening;

    // Initialize the velocities
    for (let i: u32 = 0; i < this.num; i++) {
      this.winds[i] = new Vec2(0, 0);
      this.velocities[i] = new Vec2(0, 0);
    }
  }

  tick(deltaMs: f32): void {
    // Determines the degree of chaos in motion
    const turbulenceFactor: f32 = (this._turbulence * deltaMs) / 1000;
    const turbulenceVec = new Vec2(0, 0);
    const windVec = new Vec2(0, 0);

    // Update the velocities
    for (let i: u32 = 0; i < this.num; i++) {
      const windSpeed = this.winds[i];
      windVec.x = (windSpeed.x * deltaMs) / 1000;
      windVec.y = (windSpeed.y * deltaMs) / 1000;

      const vel = this.velocities[i];

      // Add a small random turbulence
      turbulenceVec.x = ((Math.random() as f32) * 2.0 - 1.0) * turbulenceFactor;
      turbulenceVec.y = ((Math.random() as f32) * 2.0 - 1.0) * turbulenceFactor;

      vel.x += windVec.x;
      vel.y += windVec.y;

      vel.x += turbulenceVec.x;
      vel.y += turbulenceVec.y;

      // Apply damping to reduce velocity slightly
      vel.scale(this._dampening);

      // Don't go faster than the wind
      if (vel.magnitude > windSpeed.magnitude) {
        vel.scale(windSpeed.magnitude / vel.magnitude);
      }
    }

    // Update the positions
    super.tick(deltaMs);
  }

  protected _getInitPosition(i: u32): StaticArray<f32> {
    // Get a random position all along the top of the camera frame
    const ul = this._cameraFrame.upperLeft;
    const lr = this._cameraFrame.lowerRight;
    const x = (Math.random() as f32) * (lr.x - ul.x) + ul.x;
    const y = ul.y - (this._offScreenPadding - 1);
    return [x, y];
  }

  // Wrap the particles around the screen
  protected _getResetPosition(index: u32, x: f32, y: f32): StaticArray<f32> {
    const ulx = this._cameraFrame.upperLeft.x - this._offScreenPadding;
    const uly = this._cameraFrame.upperLeft.y - this._offScreenPadding;
    const lrx = this._cameraFrame.lowerRight.x + this._offScreenPadding;
    const lry = this._cameraFrame.lowerRight.y + this._offScreenPadding;

    if (x < ulx) {
      x = lrx;
    } else if (x > lrx) {
      x = ulx;
    }

    if (y < uly) {
      y = lry;
    } else if (y > lry) {
      y = uly;
    }

    return [x, y];
  }
}
