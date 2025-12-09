interface SinkProps {
  name: string;
  amt: number;
}

export interface CharProps {
  friction: number;
  traction: number;
  sink: SinkProps;
}
