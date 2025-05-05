class SinkProps {
  name!: string;
  amt!: f32;
}

export class CharProps {
  friction: f32 = 0;
  traction: f32 = 0;
  sink!: SinkProps;
}
