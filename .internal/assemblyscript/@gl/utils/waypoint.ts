import { Vector } from "../api/types/vector";
import { Waypoint as ApiWaypoint } from "../api/types/waypoint";
import * as host from "../api/w2h/host";
import { Vec2 } from "./la/vec2";

export class Waypoint {
  public pos: Vec2;
  public speed: f32;
  public pause: f32; // ms

  constructor(pos: Vector, pause: f32 = 1000, speed: f32 = 1.0) {
    this.pos = Vec2.fromVector(pos);
    this.speed = speed;
    this.pause = pause;
  }

  public static fromName(
    name: string,
    pause: f32 = 1000,
    speed: f32 = 1.0
  ): Waypoint {
    const awp = host.navigation.getWaypoint(name);
    const wp = Waypoint.fromApi(awp);
    wp.speed = speed;
    wp.pause = pause;
    return wp;
  }

  public static fromApi(wp: ApiWaypoint): Waypoint {
    return new Waypoint(wp.pos);
  }

  public get isNull(): bool {
    return this.speed < 0;
  }
}

@lazy
export const nullWaypoint = new Waypoint({ x: 0, y: 0 }, 0, -1);
