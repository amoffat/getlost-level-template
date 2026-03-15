import { type Vector } from "../api/types/vector";
import { Waypoint as ApiWaypoint } from "../api/types/waypoint";
import * as navigation from "../api/w2h/navigation";
import { Vec2 } from "./la/vec2";

export class Waypoint {
  public pos: Vec2;
  public speed: number = 1.0;
  public pause: number = 1000; // ms
  public nearestIsOk: boolean = false;

  constructor(pos: Vector, pause: number = 1000, speed: number = 1.0) {
    this.pos = Vec2.fromVector(pos);
    this.speed = speed;
    this.pause = pause;
  }

  public static null(): Waypoint {
    const wp = new Waypoint({ x: 0, y: 0 });
    wp.speed = -1;
    return wp;
  }

  public static fromName(
    name: string,
    pause: number = 1000,
    speed: number = 1.0
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

  public get isNull(): boolean {
    return this.speed < 0;
  }

  public toString(): string {
    if (this.isNull) {
      return `Waypoint(null)`;
    }
    return `Waypoint(${this.pos.toString()}, ${this.speed}, ${this.pause}, ${this.nearestIsOk})`;
  }
}
