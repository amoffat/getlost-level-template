import { Card } from "@gl/types/card";

// This is your level card. It powers the `Credits` link on your level. As you
// add collaborators, include their details so they get credited for their work.
// If you use any assets that require attribution (like many Creative Commons
// licenses), include those as well.
export function card(): Card {
  return {
    level: {
      name: "Your level name",
      version: 1,
    },
    source: "https://github.com/your-username/your-repo",
    credits: [
      {
        name: "Your name",
        role: "Author",
        link: "https://your-website.com",
      },
      {
        name: "Collaborator",
        role: "Level design",
        link: "https://website.com",
      },
      {
        name: "Designer",
        role: "Level design",
        link: "https://website.com",
      },
      {
        name: "Musician",
        role: "Sound design",
        link: "https://website.com",
      },
    ],
  };
}
