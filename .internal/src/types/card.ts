export interface Card {
  level: LevelDetails;
  credits: Person[];
}

export interface LevelDetails {
  name: string;
  version: number;
}

export interface Person {
  name: string;
  role: string; // Game role, like "Writer" or "Artist"
  link: string | null; // A URL to the artist's website
}
