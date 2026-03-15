export class Entrance {
  name!: string;
  exits!: string[];
}

export class Exit {
  name!: string;
  preferredEntrance!: string;
}
