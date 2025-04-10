import * as host from "@gl/api/w2h/host";
import { String } from "@gl/types/i18n";
import * as timeUtils from "@gl/utils/time";

const log = host.debug.log;
const logError = host.debug.logError;

class State_knightOpts {
  whyTown: bool;
  whoSheikh: bool;
  howJob: bool;
  guardWhat: bool;
  yourName: bool;
  constructor() {
    this.whyTown = true;
    this.whoSheikh = true;
    this.howJob = true;
    this.guardWhat = true;
    this.yourName = true;
  }
}

class State {
  upsetKnight: bool;
  playerName: string;
  learnedKnightStory: bool;
  knightOpts: State_knightOpts;
  constructor() {
    this.upsetKnight = false;
    this.playerName = "James";
    this.learnedKnightStory = false;
    this.knightOpts = new State_knightOpts();
  }
}

export const state = new State();
const visitCount = new Map<string, u32>();
const passageLookup = new Map<string, string>();
passageLookup.set("*ahem*... I said 'Hi'", "41876c52");
passageLookup.set("Bye", "12890122");
passageLookup.set("Climb down", "909a9cff");
passageLookup.set("Do you have a name?", "562cd4ad");
passageLookup.set("Fire", "c141faa8");
passageLookup.set("Guard from what?", "99e18287");
passageLookup.set("Hand him the map", "8cf42533");
passageLookup.set("Hi, I'm $playerName", "b6ea4b6d");
passageLookup.set("How did you get this job?", "379dcdf1");
passageLookup.set("How long ago was this?", "f6ded42f");
passageLookup.set("I found it by the water", "0e624e86");
passageLookup.set("I know why you're here.", "a2b8560b");
passageLookup.set("I saw a strange fire", "3bc44a17");
passageLookup.set("I'm...new here", "559c302f");
passageLookup.set("Ignore the fire", "690c49a8");
passageLookup.set("Nazar", "e1ffb1d2");
passageLookup.set("None of your business", "e0a2d72f");
passageLookup.set("Observe what?", "813cdd9a");
passageLookup.set("Oh you mean the knight?", "2ecf7f34");
passageLookup.set("Silent Knight", "491e88c5");
passageLookup.set("Start", ">start");
passageLookup.set("Step back", "b863269e");
passageLookup.set("StoryInit", ">init");
passageLookup.set("Well", "bdc7e965");
passageLookup.set("What are you looking for?", "e3ad92be");
passageLookup.set("What battle?", "e45c4215");
passageLookup.set("What do you know about that knight?", "f213214a");
passageLookup.set("What do you mean he showed up?", "9d4f68e2");
passageLookup.set("What is he guarding you from?", "216c5e8c");
passageLookup.set("What's new?", "623aab5c");
passageLookup.set("When does the knight leave?", "9b70a051");
passageLookup.set("Where are you from?", "63265a79");
passageLookup.set("Who is the Sheikh?", "885ce2f8");
passageLookup.set("Why this town?", "198a1009");
passageLookup.set("bye-silence", "9b7360e5");
passageLookup.set("nazar-who-shiekh", "d20fad6e");
passageLookup.set("no-map", "2a9618c1");
passageLookup.set("silence", "e6c18fdb");
passageLookup.set("what-did-letter-say", "aff68fcf");
passageLookup.set("what-knight", "a61db43e");
passageLookup.set("who-fire", "3d787171");
passageLookup.set("yes-knight", "5c07303d");

function isNight(): bool {
  const ev = host.time.getSunEvent();
  return timeUtils.isNight(ev);
}

function isDay(): bool {
  const ev = host.time.getSunEvent();
  return timeUtils.isDay(ev);
}

function visited(id: string): u32 {
  if (!visitCount.has(id)) {
    return 0;
  }
  const count = visitCount.get(id);
  return count;
}

function hasVisited(id: string): bool {
  return visitCount.has(id);
}

function lastVisited(passage: string): u32 {
  return 0;
}

function random(min: f32, max: f32): f32 {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: f32, max: f32): f32 {
  return Math.random() * (max - min) + min;
}

function either<T>(options: T[]): T {
  const idx = Math.floor(Math.random() * options.length) as u32;
  return options[idx];
}

function incrementVisitCount(id: string): void {
  if (!visitCount.has(id)) {
    visitCount.set(id, 0);
  }
  visitCount.set(id, visitCount.get(id) + 1);
}

export function strings(): String[] {
  return [
    {
      key: "198a1009",
      values: [
        {
          text: "Why this town?",
          lang: "en",
        },
      ],
    },

    {
      key: "885ce2f8",
      values: [
        {
          text: "Who is the Sheikh?",
          lang: "en",
        },
      ],
    },

    {
      key: "379dcdf1",
      values: [
        {
          text: "How did you get this job?",
          lang: "en",
        },
      ],
    },

    {
      key: "99e18287",
      values: [
        {
          text: "Guard from what?",
          lang: "en",
        },
      ],
    },

    {
      key: "562cd4ad",
      values: [
        {
          text: "Do you have a name?",
          lang: "en",
        },
      ],
    },

    {
      key: "12890122",
      values: [
        {
          text: "Bye",
          lang: "en",
        },
      ],
    },

    {
      key: "aa225fe0",
      values: [
        {
          text: "Be well.",
          lang: "en",
        },
      ],
    },

    {
      key: "219e54e3",
      values: [
        {
          text: "well",
          lang: "en",
        },
      ],
    },

    {
      key: "006d3ad6",
      values: [
        {
          text: "Sir Azure",
          lang: "en",
        },
      ],
    },

    {
      key: "bbe687cd",
      values: [
        {
          text: "Greetings.... traveller...",
          lang: "en",
        },
      ],
    },

    {
      key: "80495816",
      values: [
        {
          text: "Who are you?",
          lang: "en",
        },
      ],
    },

    {
      key: "3d787171",
      values: [
        {
          text: "Who are you?",
          lang: "en",
        },
      ],
    },

    {
      key: "690c49a8",
      values: [
        {
          text: "Ignore the fire",
          lang: "en",
        },
      ],
    },

    {
      key: "96f38b61",
      values: [
        {
          text: "That's not your concern.",
          lang: "en",
        },
      ],
    },

    {
      key: "159272d5",
      values: [
        {
          text: "I haven't seen you before, are you here with the Knight?",
          lang: "en",
        },
      ],
    },

    {
      key: "6451edb5",
      values: [
        {
          text: "What Knight?",
          lang: "en",
        },
      ],
    },

    {
      key: "a61db43e",
      values: [
        {
          text: "What Knight?",
          lang: "en",
        },
      ],
    },

    {
      key: "85a39ab3",
      values: [
        {
          text: "Yes",
          lang: "en",
        },
      ],
    },

    {
      key: "5c07303d",
      values: [
        {
          text: "Yes",
          lang: "en",
        },
      ],
    },

    {
      key: "bc301063",
      values: [
        {
          text: "I.. uh... I volunteered. It's a long story, and I'm very busy right now.",
          lang: "en",
        },
      ],
    },

    {
      key: "dff1fa28",
      values: [
        {
          text: "Only a week ago.",
          lang: "en",
        },
      ],
    },

    {
      key: "1de8ad8f",
      values: [
        {
          text: "I left it there. Give it to me.",
          lang: "en",
        },
      ],
    },

    {
      key: "38178a20",
      values: [
        {
          text: "No.",
          lang: "en",
        },
      ],
    },

    {
      key: "2a9618c1",
      values: [
        {
          text: "Run away",
          lang: "en",
        },
      ],
    },

    {
      key: "8cf42533",
      values: [
        {
          text: "Hand him the map",
          lang: "en",
        },
      ],
    },

    {
      key: "13ac241f",
      values: [
        {
          text: "So you talked to Nazar...",
          lang: "en",
        },
      ],
    },

    {
      key: "be1ca5bd",
      values: [
        {
          text: "You are? Interesting...",
          lang: "en",
        },
      ],
    },

    {
      key: "18083266",
      values: [
        {
          text: "Hello again.",
          lang: "en",
        },
      ],
    },

    {
      key: "623aab5c",
      values: [
        {
          text: "What's new?",
          lang: "en",
        },
      ],
    },

    {
      key: "83e37e65",
      values: [
        {
          text: "Welcome, I'm Nazar",
          lang: "en",
        },
      ],
    },

    {
      key: "b6ea4b6d",
      values: [
        {
          text: "Hi, I'm $playerName",
          lang: "en",
        },
      ],
    },

    {
      key: "59302599",
      values: [
        {
          text: "Silent Knight",
          lang: "en",
        },
      ],
    },

    {
      key: "f213214a",
      values: [
        {
          text: "What do you know about that knight?",
          lang: "en",
        },
      ],
    },

    {
      key: "30b9028d",
      values: [
        {
          text: "Fire",
          lang: "en",
        },
      ],
    },

    {
      key: "3bc44a17",
      values: [
        {
          text: "I saw a strange fire",
          lang: "en",
        },
      ],
    },

    {
      key: "21316f2a",
      values: [
        {
          text: "That's mine. Give it to me.",
          lang: "en",
        },
      ],
    },

    {
      key: "05e44e9b",
      values: [
        {
          text: "Run away",
          lang: "en",
        },
      ],
    },

    {
      key: "b4c1d391",
      values: [
        {
          text: "I was told this village would be getting a new visitor.",
          lang: "en",
        },
      ],
    },

    {
      key: "559c302f",
      values: [
        {
          text: "I'm...new here",
          lang: "en",
        },
      ],
    },

    {
      key: "2ecf7f34",
      values: [
        {
          text: "Oh you mean the knight?",
          lang: "en",
        },
      ],
    },

    {
      key: "0d053e12",
      values: [
        {
          text: "The person I am seeking carries a map",
          lang: "en",
        },
      ],
    },

    {
      key: "fdf9e577",
      values: [
        {
          text: "...zzzzz....h-huh? I'm awake! Oh, it's you. Leave me alone.",
          lang: "en",
        },
      ],
    },

    {
      key: "33dffa18",
      values: [
        {
          text: "map",
          lang: "en",
        },
      ],
    },

    {
      key: "80251c82",
      values: [
        {
          text: "Where did you get that map?",
          lang: "en",
        },
      ],
    },

    {
      key: "0e624e86",
      values: [
        {
          text: "I found it by the water",
          lang: "en",
        },
      ],
    },

    {
      key: "e0a2d72f",
      values: [
        {
          text: "None of your business",
          lang: "en",
        },
      ],
    },

    {
      key: "a2b8560b",
      values: [
        {
          text: "I know why you're here.",
          lang: "en",
        },
      ],
    },

    {
      key: "be9529b7",
      values: [
        {
          text: "I thought I said go away.",
          lang: "en",
        },
      ],
    },

    {
      key: "ab5df625",
      values: [
        {
          text: "...",
          lang: "en",
        },
      ],
    },

    {
      key: "3639efcd",
      values: [
        {
          text: "Hi",
          lang: "en",
        },
      ],
    },

    {
      key: "e6c18fdb",
      values: [
        {
          text: "Hi",
          lang: "en",
        },
      ],
    },

    {
      key: "7fafd7d4",
      values: [
        {
          text: "Talk to Nazar",
          lang: "en",
        },
      ],
    },

    {
      key: "e1ffb1d2",
      values: [
        {
          text: "Nazar",
          lang: "en",
        },
      ],
    },

    {
      key: "dd146f7d",
      values: [
        {
          text: "Talk to Silent Knight",
          lang: "en",
        },
      ],
    },

    {
      key: "491e88c5",
      values: [
        {
          text: "Talk to Silent Knight",
          lang: "en",
        },
      ],
    },

    {
      key: "fac5b768",
      values: [
        {
          text: "Talk to Omar",
          lang: "en",
        },
      ],
    },

    {
      key: "c141faa8",
      values: [
        {
          text: "Fire",
          lang: "en",
        },
      ],
    },

    {
      key: "bdc7e965",
      values: [
        {
          text: "Well",
          lang: "en",
        },
      ],
    },

    {
      key: "68064898",
      values: [
        {
          text: "Maybe another time.",
          lang: "en",
        },
      ],
    },

    {
      key: "0e865942",
      values: [
        {
          text: "There's a ladder going down, but you cannot see the bottom.",
          lang: "en",
        },
      ],
    },

    {
      key: "909a9cff",
      values: [
        {
          text: "Climb down",
          lang: "en",
        },
      ],
    },

    {
      key: "b863269e",
      values: [
        {
          text: "Step back",
          lang: "en",
        },
      ],
    },

    {
      key: "d6e3cd9f",
      values: [
        {
          text: "A map...",
          lang: "en",
        },
      ],
    },

    {
      key: "25aa4cfa",
      values: [
        {
          text: "You're really not from around here, are you? We've been at war since before I was born.",
          lang: "en",
        },
      ],
    },

    {
      key: "e245bb27",
      values: [
        {
          text: "Well, I know he's not from around here. There was a battle. Then he showed up.",
          lang: "en",
        },
      ],
    },

    {
      key: "9d4f68e2",
      values: [
        {
          text: "What do you mean he showed up?",
          lang: "en",
        },
      ],
    },

    {
      key: "e45c4215",
      values: [
        {
          text: "What battle?",
          lang: "en",
        },
      ],
    },

    {
      key: "a7b6d713",
      values: [
        {
          text: "I mean he arrived on foot, without a weapon and covered in blood. We thought he left the battle to raid our village. But he had a letter from the Sheikh.",
          lang: "en",
        },
      ],
    },

    {
      key: "e2092668",
      values: [
        {
          text: "What did the letter say?",
          lang: "en",
        },
      ],
    },

    {
      key: "aff68fcf",
      values: [
        {
          text: "So what did the letter say?",
          lang: "en",
        },
      ],
    },

    {
      key: "d20fad6e",
      values: [
        {
          text: "Who is the Sheikh?",
          lang: "en",
        },
      ],
    },

    {
      key: "7c1dac67",
      values: [
        {
          text: "You'll have to ask him.",
          lang: "en",
        },
      ],
    },

    {
      key: "88d44f50",
      values: [
        {
          text: "Not much.",
          lang: "en",
        },
      ],
    },

    {
      key: "fe9df577",
      values: [
        {
          text: "A different place.",
          lang: "en",
        },
      ],
    },

    {
      key: "8afcb04f",
      values: [
        {
          text: "He sent me here to guard the town.",
          lang: "en",
        },
      ],
    },

    {
      key: "76f7e319",
      values: [
        {
          text: "The Sheikh asked me to. That's all I can tell you.",
          lang: "en",
        },
      ],
    },

    {
      key: "6c3f1cc4",
      values: [
        {
          text: "The Sheikh created this village.",
          lang: "en",
        },
      ],
    },

    {
      key: "c40b2d30",
      values: [
        {
          text: "So what did the letter say?",
          lang: "en",
        },
      ],
    },

    {
      key: "41876c52",
      values: [
        {
          text: "*ahem*... I said 'Hi'",
          lang: "en",
        },
      ],
    },

    {
      key: "9b7360e5",
      values: [
        {
          text: "Bye",
          lang: "en",
        },
      ],
    },

    {
      key: "f5654ac2",
      values: [
        {
          text: 'It said "Give food and water to this soldier. In return he will guard the village." It had the Sheikh\'s seal. It was unmistakable.',
          lang: "en",
        },
      ],
    },

    {
      key: "f6ded42f",
      values: [
        {
          text: "How long ago was this?",
          lang: "en",
        },
      ],
    },

    {
      key: "9b70a051",
      values: [
        {
          text: "When does the knight leave?",
          lang: "en",
        },
      ],
    },

    {
      key: "216c5e8c",
      values: [
        {
          text: "What is he guarding you from?",
          lang: "en",
        },
      ],
    },

    {
      key: "d95d75d7",
      values: [
        {
          text: "There's a knight to the south. He doesn't talk much. Go see for yourself.",
          lang: "en",
        },
      ],
    },

    {
      key: "e4de013f",
      values: [
        {
          text: "A fellow traveller...like you. I'm here to seek and observe.",
          lang: "en",
        },
      ],
    },

    {
      key: "63265a79",
      values: [
        {
          text: "Where are you from?",
          lang: "en",
        },
      ],
    },

    {
      key: "813cdd9a",
      values: [
        {
          text: "Observe what?",
          lang: "en",
        },
      ],
    },

    {
      key: "e3ad92be",
      values: [
        {
          text: "What are you looking for?",
          lang: "en",
        },
      ],
    },

    {
      key: "f2cb5115",
      values: [
        {
          text: "I see... let me know if you need anything.",
          lang: "en",
        },
      ],
    },

    {
      key: "f24b5246",
      values: [
        {
          text: "Knight",
          lang: "en",
        },
      ],
    },
  ];
}

/**
 * Called when the player interacts with a choice dialog.
 *
 * @param passageId The id of the passage that the user interacted with.
 * @param passageId The id of the choice that the user made.
 */
export function choiceMadeEvent(passageId: string, choiceId: string): void {
  log(`Choice made for ${passageId}: ${choiceId}`);
  dispatch(choiceId);
}

// Bye
export function passage_12890122(): void {
  // "Knight"
  const title = "f24b5246";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();
  incrementVisitCount("12890122");

  // Be well.
  text = "aa225fe0";

  if (text.length > 0) {
    host.text.display(title, text, choices, params, animate);
  }
}

// Climb down
export function passage_909a9cff(): void {
  // "Well"
  const title = "bdc7e965";
  const animate = false;
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();
  incrementVisitCount("909a9cff");

  host.map.exit("well", true);

  if (text.length > 0) {
    host.text.display(title, text, choices, params, animate);
  }
}

// Do you have a name?
export function passage_562cd4ad(): void {
  // "Knight"
  const title = "f24b5246";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();
  incrementVisitCount("562cd4ad");

  state.knightOpts.yourName = false;
  // Sir Azure
  text = "006d3ad6";
  if (state.knightOpts.whyTown) {
    // Why this town?
    choices.push("198a1009");
  }
  if (state.knightOpts.whoSheikh) {
    // Who is the Sheikh?
    choices.push("885ce2f8");
  }
  if (state.knightOpts.howJob) {
    // How did you get this job?
    choices.push("379dcdf1");
  }
  if (state.knightOpts.guardWhat) {
    // Guard from what?
    choices.push("99e18287");
  }
  if (state.knightOpts.yourName) {
    // Do you have a name?
    choices.push("562cd4ad");
  }
  // Bye
  choices.push("12890122");

  if (text.length > 0) {
    host.text.display(title, text, choices, params, animate);
  }
}

// Fire
export function passage_c141faa8(): void {
  // "Fire"
  const title = "c141faa8";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();
  incrementVisitCount("c141faa8");

  // Greetings.... traveller...
  text = "bbe687cd";
  // Who are you?
  choices.push("3d787171");
  // Ignore the fire
  choices.push("690c49a8");

  if (text.length > 0) {
    host.text.display(title, text, choices, params, animate);
  }
}

// Guard from what?
export function passage_99e18287(): void {
  // "Knight"
  const title = "f24b5246";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();
  incrementVisitCount("99e18287");

  state.knightOpts.guardWhat = false;
  // That's not your concern.
  text = "96f38b61";
  if (state.knightOpts.whyTown) {
    // Why this town?
    choices.push("198a1009");
  }
  if (state.knightOpts.whoSheikh) {
    // Who is the Sheikh?
    choices.push("885ce2f8");
  }
  if (state.knightOpts.howJob) {
    // How did you get this job?
    choices.push("379dcdf1");
  }
  if (state.knightOpts.guardWhat) {
    // Guard from what?
    choices.push("99e18287");
  }
  if (state.knightOpts.yourName) {
    // Do you have a name?
    choices.push("562cd4ad");
  }
  // Bye
  choices.push("12890122");

  if (text.length > 0) {
    host.text.display(title, text, choices, params, animate);
  }
}

// Hi, I'm $playerName
export function passage_b6ea4b6d(): void {
  // "Nazar"
  const title = "e1ffb1d2";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();
  incrementVisitCount("b6ea4b6d");

  // I haven't seen you before, are you here with the Knight?
  text = "159272d5";
  // What Knight?
  choices.push("a61db43e");
  // Yes
  choices.push("5c07303d");

  if (text.length > 0) {
    host.text.display(title, text, choices, params, animate);
  }
}

// How did you get this job?
export function passage_379dcdf1(): void {
  // "Knight"
  const title = "f24b5246";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();
  incrementVisitCount("379dcdf1");

  state.knightOpts.howJob = false;
  // I.. uh... I volunteered. It's a long story, and I'm very busy right now.
  text = "bc301063";
  if (state.knightOpts.whyTown) {
    // Why this town?
    choices.push("198a1009");
  }
  if (state.knightOpts.whoSheikh) {
    // Who is the Sheikh?
    choices.push("885ce2f8");
  }
  if (state.knightOpts.howJob) {
    // How did you get this job?
    choices.push("379dcdf1");
  }
  if (state.knightOpts.guardWhat) {
    // Guard from what?
    choices.push("99e18287");
  }
  if (state.knightOpts.yourName) {
    // Do you have a name?
    choices.push("562cd4ad");
  }
  // Bye
  choices.push("12890122");

  if (text.length > 0) {
    host.text.display(title, text, choices, params, animate);
  }
}

// How long ago was this?
export function passage_f6ded42f(): void {
  // "Nazar"
  const title = "e1ffb1d2";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();
  incrementVisitCount("f6ded42f");

  // Only a week ago.
  text = "dff1fa28";

  if (text.length > 0) {
    host.text.display(title, text, choices, params, animate);
  }
}

// I found it by the water
export function passage_0e624e86(): void {
  // "Knight"
  const title = "f24b5246";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();
  incrementVisitCount("0e624e86");

  // I left it there. Give it to me.
  text = "1de8ad8f";
  // No.
  choices.push("2a9618c1");
  // Hand him the map
  choices.push("8cf42533");

  if (text.length > 0) {
    host.text.display(title, text, choices, params, animate);
  }
}

// I know why you're here.
export function passage_a2b8560b(): void {
  // "Knight"
  const title = "f24b5246";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();
  incrementVisitCount("a2b8560b");

  // So you talked to Nazar...
  text = "13ac241f";

  if (state.knightOpts.whyTown) {
    // Why this town?
    choices.push("198a1009");
  }
  if (state.knightOpts.whoSheikh) {
    // Who is the Sheikh?
    choices.push("885ce2f8");
  }
  if (state.knightOpts.howJob) {
    // How did you get this job?
    choices.push("379dcdf1");
  }
  if (state.knightOpts.guardWhat) {
    // Guard from what?
    choices.push("99e18287");
  }
  if (state.knightOpts.yourName) {
    // Do you have a name?
    choices.push("562cd4ad");
  }
  // Bye
  choices.push("12890122");

  if (text.length > 0) {
    host.text.display(title, text, choices, params, animate);
  }
}

// I'm...new here
export function passage_559c302f(): void {
  // "Fire"
  const title = "c141faa8";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();
  incrementVisitCount("559c302f");

  // You are? Interesting...
  text = "be1ca5bd";

  if (text.length > 0) {
    host.text.display(title, text, choices, params, animate);
  }
}

// Nazar
export function passage_e1ffb1d2(): void {
  // "Nazar"
  const title = "e1ffb1d2";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();
  incrementVisitCount("e1ffb1d2");

  if (visited("e1ffb1d2") > 1) {
    // Hello again.
    text = "18083266";
    // What's new?
    choices.push("623aab5c");
  } else {
    // Welcome, I'm Nazar
    text = "83e37e65";
    // Hi, I'm $playerName
    choices.push("b6ea4b6d");
  }
  if (visited(passageLookup.get("Silent Knight"))) {
    // What do you know about that knight?
    choices.push("f213214a");
  }
  if (visited(passageLookup.get("Fire"))) {
    // I saw a strange fire
    choices.push("3bc44a17");
  }

  if (text.length > 0) {
    host.text.display(title, text, choices, params, animate);
  }
}

// None of your business
export function passage_e0a2d72f(): void {
  // "Knight"
  const title = "f24b5246";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();
  incrementVisitCount("e0a2d72f");

  // That's mine. Give it to me.
  text = "21316f2a";
  // Run away
  choices.push("2a9618c1");
  // Hand him the map
  choices.push("8cf42533");

  if (text.length > 0) {
    host.text.display(title, text, choices, params, animate);
  }
}

// Observe what?
export function passage_813cdd9a(): void {
  // "Fire"
  const title = "c141faa8";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();
  incrementVisitCount("813cdd9a");

  // I was told this village would be getting a new visitor.
  text = "b4c1d391";
  // I'm...new here
  choices.push("559c302f");
  // Oh you mean the knight?
  choices.push("2ecf7f34");

  if (text.length > 0) {
    host.text.display(title, text, choices, params, animate);
  }
}

// Oh you mean the knight?
export function passage_2ecf7f34(): void {
  // "Fire"
  const title = "c141faa8";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();
  incrementVisitCount("2ecf7f34");

  // The person I am seeking carries a map
  text = "0d053e12";

  if (text.length > 0) {
    host.text.display(title, text, choices, params, animate);
  }
}

// Silent Knight
export function passage_491e88c5(): void {
  // "Knight"
  const title = "f24b5246";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();
  incrementVisitCount("491e88c5");

  const pickup_tags_1 = new Array<string>();
  pickup_tags_1.push("type");
  pickup_tags_1.push("map");

  if (isNight()) {
    // ...zzzzz....h-huh? I'm awake! Oh, it's you. Leave me alone.
    text = "fdf9e577";
  } else {
    if (host.pickup.get(pickup_tags_1).length > 0) {
      // Where did you get that map?
      text = "80251c82";
      // I found it by the water
      choices.push("0e624e86");
      // None of your business
      choices.push("e0a2d72f");
    } else if (state.learnedKnightStory) {
      // I know why you're here.
      choices.push("a2b8560b");
    } else if (state.upsetKnight) {
      // I thought I said go away.
      text = "be9529b7";
    } else {
      // ...
      text = "ab5df625";
      // Hi
      choices.push("e6c18fdb");
    }
  }

  if (text.length > 0) {
    host.text.display(title, text, choices, params, animate);
  }
}

// Step back
export function passage_b863269e(): void {
  // "Well"
  const title = "bdc7e965";
  const animate = false;
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();
  incrementVisitCount("b863269e");

  // Maybe another time.
  text = "68064898";

  if (text.length > 0) {
    host.text.display(title, text, choices, params, animate);
  }
}

// Well
export function passage_bdc7e965(): void {
  // "Well"
  const title = "bdc7e965";
  const animate = false;
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();
  incrementVisitCount("bdc7e965");

  // There's a ladder going down, but you cannot see the bottom.
  text = "0e865942";
  // Climb down
  choices.push("909a9cff");
  // Step back
  choices.push("b863269e");

  if (text.length > 0) {
    host.text.display(title, text, choices, params, animate);
  }
}

// What are you looking for?
export function passage_e3ad92be(): void {
  // "Fire"
  const title = "c141faa8";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();
  incrementVisitCount("e3ad92be");

  // A map...
  text = "d6e3cd9f";

  if (text.length > 0) {
    host.text.display(title, text, choices, params, animate);
  }
}

// What battle?
export function passage_e45c4215(): void {
  // "Nazar"
  const title = "e1ffb1d2";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();
  incrementVisitCount("e45c4215");

  // You're really not from around here, are you? We've been at war since before I was born.
  text = "25aa4cfa";

  if (text.length > 0) {
    host.text.display(title, text, choices, params, animate);
  }
}

// What do you know about that knight?
export function passage_f213214a(): void {
  // "Nazar"
  const title = "e1ffb1d2";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();
  incrementVisitCount("f213214a");

  // Well, I know he's not from around here. There was a battle. Then he showed up.
  text = "e245bb27";
  // What do you mean he showed up?
  choices.push("9d4f68e2");
  // What battle?
  choices.push("e45c4215");

  if (text.length > 0) {
    host.text.display(title, text, choices, params, animate);
  }
}

// What do you mean he showed up?
export function passage_9d4f68e2(): void {
  // "Nazar"
  const title = "e1ffb1d2";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();
  incrementVisitCount("9d4f68e2");

  // I mean he arrived on foot, without a weapon and covered in blood. We thought he left the battle to raid our village. But he had a letter from the Sheikh.
  text = "a7b6d713";
  // What did the letter say?
  choices.push("aff68fcf");
  // Who is the Sheikh?
  choices.push("d20fad6e");

  if (text.length > 0) {
    host.text.display(title, text, choices, params, animate);
  }
}

// What is he guarding you from?
export function passage_216c5e8c(): void {
  // "Nazar"
  const title = "e1ffb1d2";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();
  incrementVisitCount("216c5e8c");

  // You'll have to ask him.
  text = "7c1dac67";

  if (text.length > 0) {
    host.text.display(title, text, choices, params, animate);
  }
}

// What's new?
export function passage_623aab5c(): void {
  // "Nazar"
  const title = "e1ffb1d2";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();
  incrementVisitCount("623aab5c");

  // Not much.
  text = "88d44f50";

  if (text.length > 0) {
    host.text.display(title, text, choices, params, animate);
  }
}

// Where are you from?
export function passage_63265a79(): void {
  // "Fire"
  const title = "c141faa8";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();
  incrementVisitCount("63265a79");

  // A different place.
  text = "fe9df577";

  if (text.length > 0) {
    host.text.display(title, text, choices, params, animate);
  }
}

// Who is the Sheikh?
export function passage_885ce2f8(): void {
  // "Knight"
  const title = "f24b5246";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();
  incrementVisitCount("885ce2f8");

  state.knightOpts.whoSheikh = false;
  // He sent me here to guard the town.
  text = "8afcb04f";
  if (state.knightOpts.whyTown) {
    // Why this town?
    choices.push("198a1009");
  }
  if (state.knightOpts.whoSheikh) {
    // Who is the Sheikh?
    choices.push("885ce2f8");
  }
  if (state.knightOpts.howJob) {
    // How did you get this job?
    choices.push("379dcdf1");
  }
  if (state.knightOpts.guardWhat) {
    // Guard from what?
    choices.push("99e18287");
  }
  if (state.knightOpts.yourName) {
    // Do you have a name?
    choices.push("562cd4ad");
  }
  // Bye
  choices.push("12890122");

  if (text.length > 0) {
    host.text.display(title, text, choices, params, animate);
  }
}

// Why this town?
export function passage_198a1009(): void {
  // "Knight"
  const title = "f24b5246";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();
  incrementVisitCount("198a1009");

  state.knightOpts.whyTown = false;
  // The Sheikh asked me to. That's all I can tell you.
  text = "76f7e319";
  if (state.knightOpts.whyTown) {
    // Why this town?
    choices.push("198a1009");
  }
  if (state.knightOpts.whoSheikh) {
    // Who is the Sheikh?
    choices.push("885ce2f8");
  }
  if (state.knightOpts.howJob) {
    // How did you get this job?
    choices.push("379dcdf1");
  }
  if (state.knightOpts.guardWhat) {
    // Guard from what?
    choices.push("99e18287");
  }
  if (state.knightOpts.yourName) {
    // Do you have a name?
    choices.push("562cd4ad");
  }
  // Bye
  choices.push("12890122");

  if (text.length > 0) {
    host.text.display(title, text, choices, params, animate);
  }
}

// nazar-who-shiekh
export function passage_d20fad6e(): void {
  // "Nazar"
  const title = "e1ffb1d2";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();
  incrementVisitCount("d20fad6e");

  // The Sheikh created this village.
  text = "6c3f1cc4";
  // So what did the letter say?
  choices.push("aff68fcf");

  if (text.length > 0) {
    host.text.display(title, text, choices, params, animate);
  }
}

// silence
export function passage_e6c18fdb(): void {
  // "Knight"
  const title = "f24b5246";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();
  incrementVisitCount("e6c18fdb");

  // ...
  text = "ab5df625";
  // *ahem*... I said 'Hi'
  choices.push("41876c52");
  // Bye
  choices.push("9b7360e5");

  if (text.length > 0) {
    host.text.display(title, text, choices, params, animate);
  }
}

// what-did-letter-say
export function passage_aff68fcf(): void {
  // "Nazar"
  const title = "e1ffb1d2";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();
  incrementVisitCount("aff68fcf");

  // It said "Give food and water to this soldier. In return he will guard the village." It had the Sheikh's seal. It was unmistakable.
  text = "f5654ac2";
  // How long ago was this?
  choices.push("f6ded42f");
  // When does the knight leave?
  choices.push("9b70a051");
  // What is he guarding you from?
  choices.push("216c5e8c");
  state.learnedKnightStory = true;

  if (text.length > 0) {
    host.text.display(title, text, choices, params, animate);
  }
}

// what-knight
export function passage_a61db43e(): void {
  // "Nazar"
  const title = "e1ffb1d2";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();
  incrementVisitCount("a61db43e");

  // There's a knight to the south. He doesn't talk much. Go see for yourself.
  text = "d95d75d7";

  if (text.length > 0) {
    host.text.display(title, text, choices, params, animate);
  }
}

// who-fire
export function passage_3d787171(): void {
  // "Fire"
  const title = "c141faa8";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();
  incrementVisitCount("3d787171");

  // A fellow traveller...like you. I'm here to seek and observe.
  text = "e4de013f";
  // Where are you from?
  choices.push("63265a79");
  // Observe what?
  choices.push("813cdd9a");
  // What are you looking for?
  choices.push("e3ad92be");

  if (text.length > 0) {
    host.text.display(title, text, choices, params, animate);
  }
}

// yes-knight
export function passage_5c07303d(): void {
  // "Nazar"
  const title = "e1ffb1d2";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();
  incrementVisitCount("5c07303d");

  // I see... let me know if you need anything.
  text = "f2cb5115";

  if (text.length > 0) {
    host.text.display(title, text, choices, params, animate);
  }
}

export function dispatch(passageId: string): void {
  let found = false;

  if (passageId === "12890122") {
    found = true;
    passage_12890122();
  }

  if (passageId === "909a9cff") {
    found = true;
    passage_909a9cff();
  }

  if (passageId === "562cd4ad") {
    found = true;
    passage_562cd4ad();
  }

  if (passageId === "c141faa8") {
    found = true;
    passage_c141faa8();
  }

  if (passageId === "99e18287") {
    found = true;
    passage_99e18287();
  }

  if (passageId === "b6ea4b6d") {
    found = true;
    passage_b6ea4b6d();
  }

  if (passageId === "379dcdf1") {
    found = true;
    passage_379dcdf1();
  }

  if (passageId === "f6ded42f") {
    found = true;
    passage_f6ded42f();
  }

  if (passageId === "0e624e86") {
    found = true;
    passage_0e624e86();
  }

  if (passageId === "a2b8560b") {
    found = true;
    passage_a2b8560b();
  }

  if (passageId === "559c302f") {
    found = true;
    passage_559c302f();
  }

  if (passageId === "e1ffb1d2") {
    found = true;
    passage_e1ffb1d2();
  }

  if (passageId === "e0a2d72f") {
    found = true;
    passage_e0a2d72f();
  }

  if (passageId === "813cdd9a") {
    found = true;
    passage_813cdd9a();
  }

  if (passageId === "2ecf7f34") {
    found = true;
    passage_2ecf7f34();
  }

  if (passageId === "491e88c5") {
    found = true;
    passage_491e88c5();
  }

  if (passageId === "b863269e") {
    found = true;
    passage_b863269e();
  }

  if (passageId === "bdc7e965") {
    found = true;
    passage_bdc7e965();
  }

  if (passageId === "e3ad92be") {
    found = true;
    passage_e3ad92be();
  }

  if (passageId === "e45c4215") {
    found = true;
    passage_e45c4215();
  }

  if (passageId === "f213214a") {
    found = true;
    passage_f213214a();
  }

  if (passageId === "9d4f68e2") {
    found = true;
    passage_9d4f68e2();
  }

  if (passageId === "216c5e8c") {
    found = true;
    passage_216c5e8c();
  }

  if (passageId === "623aab5c") {
    found = true;
    passage_623aab5c();
  }

  if (passageId === "63265a79") {
    found = true;
    passage_63265a79();
  }

  if (passageId === "885ce2f8") {
    found = true;
    passage_885ce2f8();
  }

  if (passageId === "198a1009") {
    found = true;
    passage_198a1009();
  }

  if (passageId === "d20fad6e") {
    found = true;
    passage_d20fad6e();
  }

  if (passageId === "e6c18fdb") {
    found = true;
    passage_e6c18fdb();
  }

  if (passageId === "aff68fcf") {
    found = true;
    passage_aff68fcf();
  }

  if (passageId === "a61db43e") {
    found = true;
    passage_a61db43e();
  }

  if (passageId === "3d787171") {
    found = true;
    passage_3d787171();
  }

  if (passageId === "5c07303d") {
    found = true;
    passage_5c07303d();
  }

  if (!found) {
    log(`No passage found for ${passageId}, does it have content?`);
  }
}

