export class Sprite {
  id: i32;
  resource: string;
  x: f32;
  y: f32;
  width: f32;
  height: f32;
  velocityX: f32 = 0;
  velocityY: f32 = 0;

  constructor(id: i32, resource: string) {
    this.id = id;
    this.resource = resource;
    this.x = 0;
    this.y = 0;
    this.width = 0;
    this.height = 0;
    this.velocityX = 0;
    this.velocityY = 0;
  }
}
