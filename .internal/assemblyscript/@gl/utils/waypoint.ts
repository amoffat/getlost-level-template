import { Vector } from "../api/types/vector";
import { Waypoint as ApiWaypoint } from "../api/types/waypoint";
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

  public static fromName(name: string): Waypoint {
    const wp = host.navigation.getWaypoint(name);
    return new Waypoint(wp.pos, wp.speed, wp.pause);
  }

  public static fromApi(wp: ApiWaypoint): Waypoint {
    return new Waypoint(Vec2.fromVector(wp.pos), wp.speed, wp.pause);
  }

  public get isNull(): bool {
    return this.speed < 0;
  }
}

@lazy
export const nullWaypoint = new Waypoint({ x: 0, y: 0 }, -1);
