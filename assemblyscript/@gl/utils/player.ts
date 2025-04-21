import * as host from "../api/w2h/host";
import { Vec2 } from "./la/vec2";
import { PlayerAction, PlayerMovement } from "./movement/topdown";

export class Player {
  c: PlayerMovement;

  constructor(controller: PlayerMovement) {
    this.c = controller;
  }

  static default(): Player {
    const pos = host.map.loadEntryPosition();
    const playerController = new PlayerMovement(
      pos.toVec2(), // Initial position
      new Vec2(200, 200), // Impulse
      new Vec2(100, 100), // Max speed
      50 // mass
    );
    const player = new Player(playerController);
    return player;
  }

  get direction(): Vec2 {
    return this.c.direction;
  }

  set direction(dir: Vec2) {
    this.c.direction = dir;
  }

  get pos(): Vec2 {
    return this.c.pos;
  }

  get action(): PlayerAction {
    return this.c.action;
  }

  get isMoving(): bool {
    return this.c.isMoving;
  }

  tick(deltaMS: f32): void {
    this.c.tick(deltaMS);
  }
}
