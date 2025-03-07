export class Pickup {
  // The slug of the pickup. This must match the slug of a Pickup in the Tiled map.
  slug!: string;
  // The short name of the pickup.
  name!: string;
  // The description of the pickup.
  text!: string;
  // The number of uses the pickup has. -1 means infinite uses.
  uses!: i32;
}
