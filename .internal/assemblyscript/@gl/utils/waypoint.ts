import { Vector } from "../api/types/vector";
import * as host from "../api/w2h/host";
import { Vec2 } from "./la/vec2";

export class Waypoint {
  public pos: Vec2;
  public speed: f32;
  public pause: f32;

  constructor(pos: Vector, speed: f32 = 1.0, pause: f32 = 0) {
    this.pos = Vec2.fromVector(pos);
    this.speed = speed;
    this.pause = pause;
  }

  static fromName(name: string): Waypoint {
    const wp = host.navigation.getWaypoint(name);
    return new Waypoint(wp.pos, wp.speed, wp.pause);
  }
}
