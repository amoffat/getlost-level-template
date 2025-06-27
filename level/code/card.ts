import { Card } from "@gl/types/card";

// This is your level card. It powers the `Credits` link on your level. As you
// add collaborators, include their details so they get credited for their work.
// If you use any assets that require attribution (like many Creative Commons
// licenses), include those as well.
export function card(): Card {
  return {
    level: {
      name: "Template level",
      version: 1,
    },
    credits: [
      {
        name: "Andrew",
        role: "Author",
        link: "https://x.com/GetLostTheGame",
      },
      {
        name: "Andrew",
        role: "Level design",
        link: "https://x.com/GetLostTheGame",
      },
      {
        name: "Pixel Boy",
        role: "Music",
        link: "https://x.com/2Pblog1",
      },
      {
        name: "Pixel Boy",
        role: "Tileset artist",
        link: "https://x.com/2Pblog1",
      },
    ],
  };
}
