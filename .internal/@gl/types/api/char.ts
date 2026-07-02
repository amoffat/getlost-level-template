interface SinkProps {
  name: string;
  amt: number;
}

export interface CharProps {
  friction: number;
  traction: number;
  sink: SinkProps;
}

/**
 * The minimal character data returned by the host when enumerating all
 * characters in the level (see `getAll`).
 */
export interface ApiCharacter {
  id: string;
  tags: string[];
}
