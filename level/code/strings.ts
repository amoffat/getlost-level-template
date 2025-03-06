import { String } from "@gl/types/i18n";

// This function returns an array of strings that are used in your level. You
// don't need every translation for every string, just the ones you want to
// manually translate. The rest will be machine translated.
export function strings(): String[] {
  return [
    {
      key: "oasis-entry-title",
      description: "The title of the oasis entry sign.",
      values: [
        {
          text: "🏝️ Mysterious Oasis",
          lang: "en",
          age: 0,
        },
      ],
    },
    {
      key: "oasis-entry-body",
      description: "The body of the oasis entry sign.",
      values: [
        {
          text: "There's something strange about the water here...",
          lang: "en",
          age: 0,
        },
      ],
    },
    {
      key: "well-title",
      description: "The title of the well interaction.",
      values: [
        {
          text: "The Well",
          lang: "en",
          age: 0,
        },
      ],
    },
    {
      key: "well-body",
      description: "The body of the well interaction.",
      values: [
        {
          text: "There's something at the bottom of the well.",
          lang: "en",
          age: 0,
        },
      ],
    },
    {
      key: "jump-down",
      description: "The action to jump into the well",
      values: [
        {
          text: "Jump down",
          lang: "en",
          age: 0,
        },
      ],
    },
    {
      key: "step-back",
      description: "The action to step back from the well",
      values: [
        {
          text: "Step back",
          lang: "en",
          age: 0,
        },
      ],
    },
    {
      key: "flame-title",
      description: "The title of the flame interaction.",
      values: [
        {
          text: "The Flame",
          lang: "en",
          age: 0,
        },
      ],
    },
    {
      key: "flame-body",
      description: "The body of the flame interaction.",
      values: [
        {
          text: "Can I help you?",
          lang: "en",
          age: 0,
        },
      ],
    },
    {
      key: "knight-title",
      description: "The title of the silent knight interaction.",
      values: [
        {
          text: "The Silent Knight",
          lang: "en",
          age: 0,
        },
      ],
    },
    {
      key: "knight-body",
      description: "The body of the silent knight interaction.",
      values: [
        {
          text: "...",
          lang: "en",
          age: 0,
        },
      ],
    },
  ];
}
