import * as navigation from "@gl/api/navigation";
import { type Vector2 } from "@gl/types/api/vector";
import { Vec2 } from "./vec2";

export class Waypoint {
  public pos: Vec2;
  public speed: number = 1.0;
  public pause: number = 1000; // ms
  public nearestIsOk: boolean = false;

  constructor({
    pos,
    pause = 1000,
    speed = 1,
  }: {
    pos: Vector2;
    pause?: number;
    speed?: number;
  }) {
    this.pos = Vec2.fromVector2(pos);
    this.speed = speed;
    this.pause = pause;
  }

  public static fromName(
    name: string,
    pause: number = 1000,
    speed: number = 1.0,
  ): Waypoint {
    const awp = navigation.getWaypointByName(name);
    if (!awp) return new Waypoint({ pos: { x: 0, y: 0 } });
    const wp = new Waypoint({ ...awp, speed, pause });
    return wp;
  }

  public toString(): string {
    return `Waypoint(${this.pos.toString()}, ${this.speed}, ${this.pause}, ${this.nearestIsOk})`;
  }
}
