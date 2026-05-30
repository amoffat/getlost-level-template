import * as navigation from "@gl/api/navigation";
import { type Vector2 } from "@gl/types/api/vector";
import { Waypoint as ApiWaypoint } from "@gl/types/api/waypoint";
import { Vec2 } from "./vec2";

export class Waypoint {
  public pos: Vec2;
  public speed: number = 1.0;
  public pause: number = 1000; // ms
  public nearestIsOk: boolean = false;

  constructor(pos: Vector2, pause: number = 1000, speed: number = 1.0) {
    this.pos = Vec2.fromVector2(pos);
    this.speed = speed;
    this.pause = pause;
  }

  public static fromName(
    name: string,
    pause: number = 1000,
    speed: number = 1.0,
  ): Waypoint {
    const awp = navigation.getWaypoint(name);
    const wp = Waypoint.fromApi(awp);
    wp.speed = speed;
    wp.pause = pause;
    return wp;
  }

  public static fromApi(wp: ApiWaypoint): Waypoint {
    return new Waypoint(wp.pos);
  }

  public toString(): string {
    return `Waypoint(${this.pos.toString()}, ${this.speed}, ${this.pause}, ${this.nearestIsOk})`;
  }
}
