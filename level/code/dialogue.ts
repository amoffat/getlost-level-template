import * as host from "@gl/api/w2h/host";
import { String } from "@gl/types/i18n";

const log = host.debug.log;
const logError = host.debug.logError;

class State_frankOpts {
  constructor() {}
}

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
  frankOpts: State_frankOpts;
  learnedKnightStory: bool;
  knightOpts: State_knightOpts;
  constructor() {
    this.upsetKnight = false;
    this.playerName = "James";
    this.frankOpts = new State_frankOpts();
    this.learnedKnightStory = true;
    this.knightOpts = new State_knightOpts();
  }
}

export const state = new State();
const visitCount = new Map<string, u32>();
const passageLookup = new Map<string, string>();
passageLookup.set("Bye", "12890122");
passageLookup.set("Climb down", "909a9cff");
passageLookup.set("Do you have a name?", "562cd4ad");
passageLookup.set("Fire", "c141faa8");
passageLookup.set("Guard from what?", "99e18287");
passageLookup.set("Hand him the map", "8cf42533");
passageLookup.set("Hi, I'm $playerName", "b6ea4b6d");
passageLookup.set(
  "How about I get you a glass of water and you tell me?",
  "9c9f3b81",
);
passageLookup.set("How did you get this job?", "379dcdf1");
passageLookup.set("How long ago was this?", "f6ded42f");
passageLookup.set("I found it by the water", "0e624e86");
passageLookup.set(
  "I guess you don't want to know the incredible story behind it.",
  "2bb0d7e2",
);
passageLookup.set("I know why you're here.", "a2b8560b");
passageLookup.set("I saw a strange fire", "3bc44a17");
passageLookup.set("Ignore the fire", "690c49a8");
passageLookup.set("Is your son Omar ok?", "f7c260b3");
passageLookup.set("Maybe I will. Where is he?", "875f1c9b");
passageLookup.set("Nazar", "e1ffb1d2");
passageLookup.set("None of your business", "e0a2d72f");
passageLookup.set("Ok ok I'll tell you", "bd7ea662");
passageLookup.set("Pretty busy are you?", "a50fd415");
passageLookup.set("Silent Knight", "491e88c5");
passageLookup.set(
  "Sounds like he probably wants to be left alone.",
  "875599d3",
);
passageLookup.set("Start", ">start");
passageLookup.set("Step back", "b863269e");
passageLookup.set("StoryInit", ">init");
passageLookup.set("Well", "bdc7e965");
passageLookup.set("What are you looking for?", "e3ad92be");
passageLookup.set("What battle?", "e45c4215");
passageLookup.set("What did it say?", "147664cc");
passageLookup.set("What do you know about that knight?", "f213214a");
passageLookup.set("What do you mean he showed up?", "9d4f68e2");
passageLookup.set("What is he guarding you from?", "216c5e8c");
passageLookup.set("What's different?", "accf28f0");
passageLookup.set("What's new?", "623aab5c");
passageLookup.set("When does the knight leave?", "9b70a051");
passageLookup.set("Where are you from?", "63265a79");
passageLookup.set("Who is the Sheikh?", "885ce2f8");
passageLookup.set("Why this town?", "198a1009");
passageLookup.set("no-map", "2a9618c1");
passageLookup.set("silence", "e6c18fdb");
passageLookup.set("what-knight", "a61db43e");
passageLookup.set("who-fire", "3d787171");
passageLookup.set("yes-knight", "5c07303d");

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
      key: "2b687db6",
      values: [
        {
          text: "Goodbye.",
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
      key: "66adb12b",
      values: [
        {
          text: "I.. uh... I volunteered. It's a long story, and I don't have time to tell it.",
          lang: "en",
        },
      ],
    },

    {
      key: "a50fd415",
      values: [
        {
          text: "Pretty busy are you?",
          lang: "en",
        },
      ],
    },

    {
      key: "9c9f3b81",
      values: [
        {
          text: "How about I get you a glass of water and you tell me?",
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
      key: "c0074ea4",
      values: [
        {
          text: "Give it to me.",
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
          text: "No.",
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
      key: "2a073c31",
      values: [
        {
          text: "You talked to Nazar...",
          lang: "en",
        },
      ],
    },

    {
      key: "cb86050b",
      values: [
        {
          text: "Yes, thank God, he is fine physically. But something changed about him. He does not talk like he once did. There is something dark in him now.",
          lang: "en",
        },
      ],
    },

    {
      key: "accf28f0",
      values: [
        {
          text: "What's different?",
          lang: "en",
        },
      ],
    },

    {
      key: "c45705cb",
      values: [
        {
          text: "Hello again",
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
      key: "54524775",
      values: [
        {
          text: "Fine. I shouldn't even be talking with you. Move along.",
          lang: "en",
        },
      ],
    },

    {
      key: "bd7ea662",
      values: [
        {
          text: "Ok ok I'll tell you",
          lang: "en",
        },
      ],
    },

    {
      key: "2bb0d7e2",
      values: [
        {
          text: "I guess you don't want to know the incredible story behind it.",
          lang: "en",
        },
      ],
    },

    {
      key: "3a7bedf8",
      values: [
        {
          text: "Yeah, actually I am, kid. Get Lost.",
          lang: "en",
        },
      ],
    },

    {
      key: "1c61a154",
      values: [
        {
          text: "Hey, where did you get that map?",
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
      key: "89a3b5f9",
      values: [
        {
          text: "I mean he arrived on foot, without weapons, covered in blood. We thought he left the battle to raid our village. But he had with him a decree from the Sheikh.",
          lang: "en",
        },
      ],
    },

    {
      key: "147664cc",
      values: [
        {
          text: "What did it say?",
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
      key: "313cd195",
      values: [
        {
          text: "He is quiet. I don't know. Go talk to him yourself.",
          lang: "en",
        },
      ],
    },

    {
      key: "875f1c9b",
      values: [
        {
          text: "Maybe I will. Where is he?",
          lang: "en",
        },
      ],
    },

    {
      key: "875599d3",
      values: [
        {
          text: "Sounds like he probably wants to be left alone.",
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
      key: "8afcb04f",
      values: [
        {
          text: "He sent me here to guard the town.",
          lang: "en",
        },
      ],
    },

    {
      key: "769e3c29",
      values: [
        {
          text: "The Sheikh asked me to.",
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
      key: "597e02b3",
      values: [
        {
          text: "A fellow traveller, like you. I'm here to observe.",
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

    {
      key: "a03b221c",
      values: [
        {
          text: "???",
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

  // Goodbye.
  text = "2b687db6";

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
  // I.. uh... I volunteered. It's a long story, and I don't have time to tell it.
  text = "66adb12b";
  // Pretty busy are you?
  choices.push("a50fd415");
  // How about I get you a glass of water and you tell me?
  choices.push("9c9f3b81");
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

  // Give it to me.
  text = "c0074ea4";
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

  // You talked to Nazar...
  text = "2a073c31";

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

// Is your son Omar ok?
export function passage_f7c260b3(): void {
  // "???"
  const title = "a03b221c";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();
  incrementVisitCount("f7c260b3");

  // Yes, thank God, he is fine physically. But something changed about him. He does not talk like he once did. There is something dark in him now.
  text = "cb86050b";
  // What's different?
  choices.push("accf28f0");

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
    // Hello again
    text = "c45705cb";
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

  // Fine. I shouldn't even be talking with you. Move along.
  text = "54524775";
  // Ok ok I'll tell you
  choices.push("bd7ea662");
  // I guess you don't want to know the incredible story behind it.
  choices.push("2bb0d7e2");

  if (text.length > 0) {
    host.text.display(title, text, choices, params, animate);
  }
}

// Pretty busy are you?
export function passage_a50fd415(): void {
  // "Knight"
  const title = "f24b5246";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();
  incrementVisitCount("a50fd415");

  // Yeah, actually I am, kid. Get Lost.
  text = "3a7bedf8";
  state.upsetKnight = true;

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

  let pickup_tags_1 = new Map<string, string>();
  pickup_tags_1.set("map", "");

  if (host.pickup.get(pickup_tags_1)) {
    // Hey, where did you get that map?
    text = "1c61a154";
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

// What did it say?
export function passage_147664cc(): void {
  // "Nazar"
  const title = "e1ffb1d2";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();
  incrementVisitCount("147664cc");

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

  // I mean he arrived on foot, without weapons, covered in blood. We thought he left the battle to raid our village. But he had with him a decree from the Sheikh.
  text = "89a3b5f9";
  // What did it say?
  choices.push("147664cc");

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

// What's different?
export function passage_accf28f0(): void {
  // "???"
  const title = "a03b221c";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();
  incrementVisitCount("accf28f0");

  // He is quiet. I don't know. Go talk to him yourself.
  text = "313cd195";
  // Maybe I will. Where is he?
  choices.push("875f1c9b");
  // Sounds like he probably wants to be left alone.
  choices.push("875599d3");

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
  // The Sheikh asked me to.
  text = "769e3c29";
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

  // A fellow traveller, like you. I'm here to observe.
  text = "597e02b3";
  // Where are you from?
  choices.push("63265a79");
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

  if (passageId === "f7c260b3") {
    found = true;
    passage_f7c260b3();
  }

  if (passageId === "e1ffb1d2") {
    found = true;
    passage_e1ffb1d2();
  }

  if (passageId === "e0a2d72f") {
    found = true;
    passage_e0a2d72f();
  }

  if (passageId === "a50fd415") {
    found = true;
    passage_a50fd415();
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

  if (passageId === "147664cc") {
    found = true;
    passage_147664cc();
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

  if (passageId === "accf28f0") {
    found = true;
    passage_accf28f0();
  }

  if (passageId === "623aab5c") {
    found = true;
    passage_623aab5c();
  }

  if (passageId === "885ce2f8") {
    found = true;
    passage_885ce2f8();
  }

  if (passageId === "198a1009") {
    found = true;
    passage_198a1009();
  }

  if (passageId === "e6c18fdb") {
    found = true;
    passage_e6c18fdb();
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

