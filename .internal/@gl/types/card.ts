// These interfaces must NEVER change, except if they are backwards-compatible
// changes. Also, it must stay in sync with the typescript interfaces.

export class Card {
  level!: LevelDetails;
  credits!: Person[];
}

export class LevelDetails {
  name!: string;
  version!: number;
}

export class Person {
  name!: string;
  role!: string;
  link!: string | null;
}
