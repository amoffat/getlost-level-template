import { MapSize } from "../api/types/map";
import * as host from "../api/w2h/host";
import { Animator, AnimatorOpts } from "./animation";
import { Box } from "./box";
import { easeInOutQuad } from "./easing";
import { Matrix } from "./la/mat";
import { Vec2 } from "./la/vec2";

type TargetFn = () => Vec2;

// THIS IS NOT ACTUALLY USED YET.
//
// The camera is currently controlled framework-side, not level-side. There are
// technical reasons for this. Mainly, there is no good way to share the
// camera's data between @gl (the Assemblyscript library), and the level's code.
// See this issue https://github.com/AssemblyScript/assemblyscript/issues/2888.
// There is also the limitation that Assemblyscript does not yet support
// closures, and we use those.
//
// Eventually though, I would like this to be the way the level's camera is
// managed. This would allow for more control over the camera, and allow for new
// types of gameplay.
export class Camera {
  private _moveAnimation: Animator;
  private _targetPos: TargetFn;
  private _lastScreenPos: Vec2 = new Vec2(0, 0);
  private _lastScreenPosSet: boolean = false;
  private _lastTargetPosInWorld: Vec2 = new Vec2(0, 0);
  private _lastTargetPosInWorldSet: boolean = false;
  private _scale: f32 = 1.0;
  private _pos: Vec2 = new Vec2(0, 0);
  desiredTileWidth: u32;

  constructor(target: TargetFn) {
    this.desiredTileWidth = 10;
    const opts = new AnimatorOpts();
    opts.duration = 1700;
    opts.forwardCurve = easeInOutQuad;
    this._moveAnimation = new Animator(opts);
    this._targetPos = target;
    this.target(target);
  }

  moveTo(pos: Vec2): void {
    // Here we'll ensure that the camera is centered on the given position. You
    // might be tempted to try to do something clever like setting the
    // container's anchor point, but given how the anchor point always needs to
    // be in the center of the canvas, dynamically updating the anchoor will
    // cause a lot of other problems.
    const targetPos = pos.flip().add(this._center);

    const moveFrom = this.pos;
    this._moveAnimation.addProgressCallback((progress) => {
      const newPos = moveFrom.lerped(targetPos, progress);
      this.pos = newPos;
    });
    this._moveAnimation.play();
  }

  get pos(): Vec2 {
    return this._pos;
  }

  set pos(pos: Vec2) {
    this._pos = this._makeValid(pos);
    host.camera.setPosition(this._pos.x, this._pos.y);
  }

  get scale(): f32 {
    return this._scale;
  }

  set scale(scale: f32) {
    this._scale = scale;
    host.camera.setScale(scale);
  }

  target(getPos: TargetFn): void {
    this._targetPos = getPos;
  }

  centerOnTarget(animate: boolean = true): void {
    if (animate) {
      // We could use moveTo, but we want the ending position to always stay up
      // to date with the target's current position.
      this._moveAnimation.clearProgressCallbacks();

      const moveFrom = this.pos;
      this._moveAnimation.addProgressCallback((progress) => {
        let tpos = this._targetPos().scale(this.scale);
        const targetPos = tpos.flip().add(this._center);
        if (this._isValid(targetPos)) {
          const newPos = moveFrom.lerped(targetPos, progress);
          this.pos = newPos;
        } else {
          this._moveAnimation.stop();
        }
      });

      this._moveAnimation.play();
    } else {
      const pos = this._targetPos().scale(this.scale);
      const targetPos = pos.flip().add(this._center);

      // FIXME why can't i use this.pos?
      host.camera.setPosition(targetPos.x, targetPos.y);
    }
  }

  private get _center(): Vec2 {
    const csize = this._canvasSize;
    return new Vec2(csize.x / 2, csize.y / 2);
  }

  tick(deltaMs: number): void {
    // The position in the world is independent of the scale of the container.
    const targetPosInWorld = this._targetPos();
    // However, to get the full screen position, we apply the container's
    // transformation, which includes the camera's scale.
    const screenPos = this._worldTransform.apply(targetPosInWorld);
    if (!this._lastScreenPosSet) {
      this._lastScreenPos = screenPos;
      this._lastScreenPosSet = true;
    }
    if (!this._lastTargetPosInWorldSet) {
      this._lastTargetPosInWorld = targetPosInWorld;
      this._lastTargetPosInWorldSet = true;
    }

    this._moveAnimation.tick(deltaMs);

    const safe = this._safeArea;
    const bleed = this._bleedArea;

    // Is the target outside of the safe area, meaning we need to start moving
    // the camera?
    if (!safe.containsPoint(screenPos)) {
      const curPos = this.pos;
      const targetDir = screenPos.subbed(this._lastScreenPos);

      // Just because we're pushing against the bounds of the safe area in one
      // direction and should move in that direction, doesn't mean we should
      // move in the other direction as well. We only want to move in the
      // direction where we're pushing against the bounds.
      const useX = !safe.containsPoint(
        new Vec2(
          screenPos.x,
          safe.center.y // guaranteed to be in the safe area
        )
      );
      const useY = !safe.containsPoint(
        new Vec2(
          safe.center.x, // guaranteed to be in the safe area
          screenPos.y
        )
      );

      const adjustDir = new Vec2(0, 0);
      if (useX) {
        adjustDir.x = -targetDir.x;
      }
      if (useY) {
        adjustDir.y = -targetDir.y;
      }

      // Now we're going to modulate the *amount* that we move the camera, based
      // on how far into the bleed area we are. The further into the bleed area,
      // the more we move the camera. This provides a much smoother camera,
      // instead of a sudden jump when the camera starts moving. We calculate
      // this by casting a ray from the center of the screen, in the direction
      // that the player is moving. This ray intersects the safe and bleed
      // areas. We do some math to determine how far into the bleed area we are.
      const targetFromCenter = screenPos.subbed(bleed.center);
      const safeIntersections = safe.raycast(safe.center, targetFromCenter);
      if (safeIntersections) {
        const safeRayFromCenter = safeIntersections[0].subbed(safe.center);
        const bleedIntersections = bleed.raycast(
          bleed.center,
          targetFromCenter
        );
        if (bleedIntersections) {
          const bleedRayFromCenter = bleedIntersections[0].subbed(safe.center);
          const denominator =
            bleedRayFromCenter.subbed(safeRayFromCenter).magnitude;
          const numerator =
            targetFromCenter.subbed(safeRayFromCenter).magnitude;
          let influence = numerator / denominator;
          if (isNaN(influence)) {
            influence = 1.0;
          }

          // What we're doing here is ensuring that we're only moving the camera
          // in the direction that the target is pushing against the safe area.
          // If we're into the safe area, but moving in the opposite direction
          // (out of the safe area), we don't want to move the camera at all.
          const sameXdir =
            Math.sign(bleedRayFromCenter.x) === Math.sign(targetDir.x);
          const sameYdir =
            Math.sign(bleedRayFromCenter.y) === Math.sign(targetDir.y);
          if (!sameXdir) {
            adjustDir.x = 0;
          }
          if (!sameYdir) {
            adjustDir.y = 0;
          }
          adjustDir.scale(Math.min(influence, 1.0) as f32);
        }
      }

      const newPos = curPos.added(adjustDir);
      this.pos = newPos;

      this._lastScreenPos = screenPos.added(adjustDir);
    } else {
      this._lastScreenPos = screenPos;
    }

    this._lastTargetPosInWorld = targetPosInWorld;
  }

  private _isValid(pos: Vec2): boolean {
    // Create the matrix that represents our proposed position.
    const mat = this._localTransform.clone();
    mat.tx = pos.x;
    mat.ty = pos.y;

    // Create a Box that represents our map's bounds, relative to the "camera"
    const mapSize = this._mapSize;
    const canvasSize = this._canvasSize;
    const mapUpperLeft = mat.apply(new Vec2(0, 0));
    const mapLowerRight = mat.apply(
      new Vec2(
        (mapSize.width * mapSize.tileWidth) as f32,
        (mapSize.height * mapSize.tileHeight) as f32
      )
    );

    // If our map contains our camera's bounds, then we're good.
    const mapBounds = Box.fromPoints(mapUpperLeft, mapLowerRight);
    const proposedBounds = Box.fromWidthHeight(
      0,
      0,
      canvasSize.x,
      canvasSize.y
    );

    return mapBounds.contains(proposedBounds);
  }

  // For a given proposed container position, and, considering the container
  // scale, determine if the new container position would not show anything
  // "outside" of the map.
  private _makeValid(pos: Vec2): Vec2 {
    // If our initial position is valid, then we're good
    if (this._isValid(pos)) {
      return pos;
    }

    const curPos = this.pos;

    // However, if it's not, there may be some variations that *are* valid.
    // Let's check those.
    const xpos = new Vec2(pos.x, curPos.y);
    const ypos = new Vec2(curPos.x, pos.y);
    if (!pos.equals(xpos) && this._isValid(xpos)) {
      return xpos;
    } else if (!pos.equals(ypos) && this._isValid(ypos)) {
      return ypos;
    }

    // Otherwise return the original position.
    return this.pos;
  }

  // No movement inside this box will trigger camera movement. Beyond this box,
  // the camera will move.
  private get _safeArea(): Box {
    const csize = this._canvasSize;
    const scale = 0.3;
    const width = (csize.x * scale) as f32;
    const height = (csize.y * scale) as f32;
    const x = (csize.x / 2 - width / 2) as f32;
    const y = (csize.y / 2 - height / 2) as f32;
    return Box.fromWidthHeight(x, y, width, height);
  }

  // Movement between the safe area and the bleed area will trigger camera
  // proportional to the distance from the safe area.
  private get _bleedArea(): Box {
    const csize = this._canvasSize;
    const scale = 0.5;
    const width = (csize.x * scale) as f32;
    const height = (csize.y * scale) as f32;
    const x = (csize.x / 2 - width / 2) as f32;
    const y = (csize.y / 2 - height / 2) as f32;
    return Box.fromWidthHeight(x, y, width, height);
  }

  onResize(width: u32, _height: u32): void {
    const mapSize = this._mapSize;
    const dtw = this.desiredTileWidth as f32;
    const tw = mapSize.tileWidth as f32;
    this.scale = (width as f32) / (dtw * tw);
  }

  private get _canvasSize(): Vec2 {
    const size = host.map.canvasSize();
    return new Vec2(size.x, size.y);
  }

  private get _mapSize(): MapSize {
    return host.map.mapSize();
  }

  private get _localTransform(): Matrix {
    return host.camera.localTransform();
  }

  private get _worldTransform(): Matrix {
    return host.camera.worldTransform();
  }
}
