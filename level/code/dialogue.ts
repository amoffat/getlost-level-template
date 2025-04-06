import * as host from "@gl/api/w2h/host";
import { String } from "@gl/types/i18n";

const log = host.debug.log;

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

class State_frankOpts {
  constructor() {}
}

class State {
  upsetKnight: bool;
  knightOpts: State_knightOpts;
  frankOpts: State_frankOpts;
  learnedKnightStory: bool;
  constructor() {
    this.upsetKnight = false;
    this.knightOpts = new State_knightOpts();
    this.frankOpts = new State_frankOpts();
    this.learnedKnightStory = true;
  }
}

export const state = new State();
const visitCount = new Map<string, u32>();
const passageLookup = new Map<string, string>();
passageLookup.set("Any new news?", "d2db7db2");
passageLookup.set("Do you have a name?", "562cd4ad");
passageLookup.set("Fire", "c141faa8");
passageLookup.set("Frank", "db605e8f");
passageLookup.set("Guard from what?", "99e18287");
passageLookup.set("Hi", "3639efcd");
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
passageLookup.set("I'll try", "250fbdc1");
passageLookup.set("Ignore the fire", "690c49a8");
passageLookup.set("Is your son Omar ok?", "f7c260b3");
passageLookup.set("Jump down", "7535a35a");
passageLookup.set("Maybe I will. Where is he?", "875f1c9b");
passageLookup.set("No?", "2b5f13fb");
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
passageLookup.set("What did it say?", "147664cc");
passageLookup.set("What do you know about that knight?", "f213214a");
passageLookup.set("What do you mean he showed up?", "9d4f68e2");
passageLookup.set("What is he guarding you from?", "216c5e8c");
passageLookup.set("What's different?", "accf28f0");
passageLookup.set("When does the knight leave?", "9b70a051");
passageLookup.set("Where are you from?", "63265a79");
passageLookup.set("Where does the knight stay?", "629dcfff");
passageLookup.set("Who are you?", "80495816");
passageLookup.set("Who is the Sheikh?", "885ce2f8");
passageLookup.set("Whoa, who are you?", "4e9c58df");
passageLookup.set("Why this town?", "198a1009");
passageLookup.set("Yes", "85a39ab3");
passageLookup.set("silence", "e6c18fdb");

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
      key: "4e9c58df",
      values: [
        {
          text: "Whoa, who are you?",
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
      key: "66212495",
      values: [
        {
          text: "Welcome back",
          lang: "en",
        },
      ],
    },

    {
      key: "d2db7db2",
      values: [
        {
          text: "Any new news?",
          lang: "en",
        },
      ],
    },

    {
      key: "e7375922",
      values: [
        {
          text: "Hello there, who are you?",
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
      key: "96f38b61",
      values: [
        {
          text: "That's not your concern.",
          lang: "en",
        },
      ],
    },

    {
      key: "894872ef",
      values: [
        {
          text: "Are you here with the Knight?",
          lang: "en",
        },
      ],
    },

    {
      key: "2b5f13fb",
      values: [
        {
          text: "No?",
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
      key: "e1ad910b",
      values: [
        {
          text: "Yeah hi, what is this place?",
          lang: "en",
        },
      ],
    },

    {
      key: "e6c18fdb",
      values: [
        {
          text: "Yeah hi, what is this place?",
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
      key: "3c837c3f",
      values: [
        {
          text: "Talk to Frank",
          lang: "en",
        },
      ],
    },

    {
      key: "db605e8f",
      values: [
        {
          text: "Frank",
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
      key: "0c71b61e",
      values: [
        {
          text: "There's something at the bottom of the well.",
          lang: "en",
        },
      ],
    },

    {
      key: "7535a35a",
      values: [
        {
          text: "Jump down",
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
      key: "75eaa53d",
      values: [
        {
          text: 'It said "This soldier should be treated like your brother. In return he will guard the city." Nothing else. But it had the Sheikh\'s seal. It was unmistakable.',
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
      key: "629dcfff",
      values: [
        {
          text: "Where does the knight stay?",
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
      key: "339e4f5f",
      values: [
        {
          text: "Well, I know he's not from around here. There was a battle nearby. My son Omar was in it...he was injured. After the battle, the knight showed up.",
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
      key: "f7c260b3",
      values: [
        {
          text: "Is your son Omar ok?",
          lang: "en",
        },
      ],
    },

    {
      key: "8c9ec535",
      values: [
        {
          text: "I mean he arrived on foot, without weapons, bleeding everywhere. We all stayed away. We thought he left the battle to raid our village. But he had with him a decree from the Sheikh.",
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
      key: "4f777751",
      values: [
        {
          text: "I don't know. When I told my son, I saw fear in him and he hasn't spoken since. Maybe you could have more luck.",
          lang: "en",
        },
      ],
    },

    {
      key: "250fbdc1",
      values: [
        {
          text: "I'll try",
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
      key: "5f61c819",
      values: [
        {
          text: "I'm here on behalf of the Sheikh. I am to guard this town.",
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
      key: "769e3c29",
      values: [
        {
          text: "The Sheikh asked me to.",
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

// Do you have a name?
export function passage_562cd4ad(): void {
  // "Knight"
  const title = "f24b5246";
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();

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

  incrementVisitCount("562cd4ad");
  host.text.displayInteraction(title, text, choices, params);
}

// Fire
export function passage_c141faa8(): void {
  // "Fire"
  const title = "c141faa8";
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();

  // Greetings.... traveller...
  text = "bbe687cd";
  // Whoa, who are you?
  choices.push("4e9c58df");
  // Ignore the fire
  choices.push("690c49a8");

  incrementVisitCount("c141faa8");
  host.text.displayInteraction(title, text, choices, params);
}

// Frank
export function passage_db605e8f(): void {
  // "Frank"
  const title = "db605e8f";
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();

  if (visited("db605e8f")) {
    // Welcome back
    text = "66212495";
    // Any new news?
    choices.push("d2db7db2");
  } else {
    // Hello there, who are you?
    text = "e7375922";
    // Hi
    choices.push("3639efcd");
  }
  if (visited(passageLookup.get("Silent Knight"))) {
    // What do you know about that knight?
    choices.push("f213214a");
  }

  incrementVisitCount("db605e8f");
  host.text.displayInteraction(title, text, choices, params);
}

// Guard from what?
export function passage_99e18287(): void {
  // "Knight"
  const title = "f24b5246";
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();

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

  incrementVisitCount("99e18287");
  host.text.displayInteraction(title, text, choices, params);
}

// Hi
export function passage_3639efcd(): void {
  // "Frank"
  const title = "db605e8f";
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();

  // Are you here with the Knight?
  text = "894872ef";
  // No?
  choices.push("2b5f13fb");
  // Yes
  choices.push("85a39ab3");

  incrementVisitCount("3639efcd");
  host.text.displayInteraction(title, text, choices, params);
}

// How did you get this job?
export function passage_379dcdf1(): void {
  // "Knight"
  const title = "f24b5246";
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();

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

  incrementVisitCount("379dcdf1");
  host.text.displayInteraction(title, text, choices, params);
}

// How long ago was this?
export function passage_f6ded42f(): void {
  // "Frank"
  const title = "db605e8f";
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();

  // Only a week ago.
  text = "dff1fa28";

  incrementVisitCount("f6ded42f");
  host.text.displayInteraction(title, text, choices, params);
}

// Is your son Omar ok?
export function passage_f7c260b3(): void {
  // "Frank"
  const title = "db605e8f";
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();

  // Yes, thank God, he is fine physically. But something changed about him. He does not talk like he once did. There is something dark in him now.
  text = "cb86050b";
  // What's different?
  choices.push("accf28f0");

  incrementVisitCount("f7c260b3");
  host.text.displayInteraction(title, text, choices, params);
}

// None of your business
export function passage_e0a2d72f(): void {
  // "Knight"
  const title = "f24b5246";
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();

  // Fine. I shouldn't even be talking with you. Move along.
  text = "54524775";
  // Ok ok I'll tell you
  choices.push("bd7ea662");
  // I guess you don't want to know the incredible story behind it.
  choices.push("2bb0d7e2");

  incrementVisitCount("e0a2d72f");
  host.text.displayInteraction(title, text, choices, params);
}

// Pretty busy are you?
export function passage_a50fd415(): void {
  // "Knight"
  const title = "f24b5246";
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();

  // Yeah, actually I am, kid. Get Lost.
  text = "3a7bedf8";
  state.upsetKnight = true;

  incrementVisitCount("a50fd415");
  host.text.displayInteraction(title, text, choices, params);
}

// Silent Knight
export function passage_491e88c5(): void {
  // "Knight"
  const title = "f24b5246";
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();

  let pickup_tags_1 = new Map<string, string>();
  pickup_tags_1.set("map", "");

  if (host.pickup.has(pickup_tags_1) && false) {
    // Hey, where did you get that map?
    text = "1c61a154";
    // I found it by the water
    choices.push("0e624e86");
    // None of your business
    choices.push("e0a2d72f");
  } else if (state.upsetKnight) {
    // I thought I said go away.
    text = "be9529b7";
  } else {
    // ...
    text = "ab5df625";
    // Yeah hi, what is this place?
    choices.push("e6c18fdb");
    // Who are you?
    choices.push("80495816");
  }

  incrementVisitCount("491e88c5");
  host.text.displayInteraction(title, text, choices, params);
}

// Well
export function passage_bdc7e965(): void {
  // "Well"
  const title = "bdc7e965";
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();

  // There's something at the bottom of the well.
  text = "0c71b61e";
  // Jump down
  choices.push("7535a35a");
  // Step back
  choices.push("b863269e");

  incrementVisitCount("bdc7e965");
  host.text.displayInteraction(title, text, choices, params);
}

// What did it say?
export function passage_147664cc(): void {
  // "Frank"
  const title = "db605e8f";
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();

  // It said "This soldier should be treated like your brother. In return he will guard the city." Nothing else. But it had the Sheikh's seal. It was unmistakable.
  text = "75eaa53d";
  // How long ago was this?
  choices.push("f6ded42f");
  // Where does the knight stay?
  choices.push("629dcfff");
  // When does the knight leave?
  choices.push("9b70a051");
  // What is he guarding you from?
  choices.push("216c5e8c");
  state.learnedKnightStory = true;

  incrementVisitCount("147664cc");
  host.text.displayInteraction(title, text, choices, params);
}

// What do you know about that knight?
export function passage_f213214a(): void {
  // "Frank"
  const title = "db605e8f";
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();

  // Well, I know he's not from around here. There was a battle nearby. My son Omar was in it...he was injured. After the battle, the knight showed up.
  text = "339e4f5f";
  // What do you mean he showed up?
  choices.push("9d4f68e2");
  // Is your son Omar ok?
  choices.push("f7c260b3");

  incrementVisitCount("f213214a");
  host.text.displayInteraction(title, text, choices, params);
}

// What do you mean he showed up?
export function passage_9d4f68e2(): void {
  // "Frank"
  const title = "db605e8f";
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();

  // I mean he arrived on foot, without weapons, bleeding everywhere. We all stayed away. We thought he left the battle to raid our village. But he had with him a decree from the Sheikh.
  text = "8c9ec535";
  // What did it say?
  choices.push("147664cc");

  incrementVisitCount("9d4f68e2");
  host.text.displayInteraction(title, text, choices, params);
}

// What is he guarding you from?
export function passage_216c5e8c(): void {
  // "Frank"
  const title = "db605e8f";
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();

  // I don't know. When I told my son, I saw fear in him and he hasn't spoken since. Maybe you could have more luck.
  text = "4f777751";
  // I'll try
  choices.push("250fbdc1");

  incrementVisitCount("216c5e8c");
  host.text.displayInteraction(title, text, choices, params);
}

// What's different?
export function passage_accf28f0(): void {
  // "Frank"
  const title = "db605e8f";
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();

  // He is quiet. I don't know. Go talk to him yourself.
  text = "313cd195";
  // Maybe I will. Where is he?
  choices.push("875f1c9b");
  // Sounds like he probably wants to be left alone.
  choices.push("875599d3");

  incrementVisitCount("accf28f0");
  host.text.displayInteraction(title, text, choices, params);
}

// Who are you?
export function passage_80495816(): void {
  // "Knight"
  const title = "f24b5246";
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();

  // I'm here on behalf of the Sheikh. I am to guard this town.
  text = "5f61c819";
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

  incrementVisitCount("80495816");
  host.text.displayInteraction(title, text, choices, params);
}

// Who is the Sheikh?
export function passage_885ce2f8(): void {
  // "Knight"
  const title = "f24b5246";
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();

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

  incrementVisitCount("885ce2f8");
  host.text.displayInteraction(title, text, choices, params);
}

// Whoa, who are you?
export function passage_4e9c58df(): void {
  // "Fire"
  const title = "c141faa8";
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();

  // A fellow traveller, like you. I'm here to observe.
  text = "597e02b3";
  // Where are you from?
  choices.push("63265a79");
  // What are you looking for?
  choices.push("e3ad92be");

  incrementVisitCount("4e9c58df");
  host.text.displayInteraction(title, text, choices, params);
}

// Why this town?
export function passage_198a1009(): void {
  // "Knight"
  const title = "f24b5246";
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();

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

  incrementVisitCount("198a1009");
  host.text.displayInteraction(title, text, choices, params);
}

// silence
export function passage_e6c18fdb(): void {
  // "Knight"
  const title = "f24b5246";
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();

  // ...
  text = "ab5df625";

  incrementVisitCount("e6c18fdb");
  host.text.displayInteraction(title, text, choices, params);
}

export function dispatch(passageId: string): void {
  let found = false;

  if (passageId === "562cd4ad") {
    found = true;
    passage_562cd4ad();
  }

  if (passageId === "c141faa8") {
    found = true;
    passage_c141faa8();
  }

  if (passageId === "db605e8f") {
    found = true;
    passage_db605e8f();
  }

  if (passageId === "99e18287") {
    found = true;
    passage_99e18287();
  }

  if (passageId === "3639efcd") {
    found = true;
    passage_3639efcd();
  }

  if (passageId === "379dcdf1") {
    found = true;
    passage_379dcdf1();
  }

  if (passageId === "f6ded42f") {
    found = true;
    passage_f6ded42f();
  }

  if (passageId === "f7c260b3") {
    found = true;
    passage_f7c260b3();
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

  if (passageId === "80495816") {
    found = true;
    passage_80495816();
  }

  if (passageId === "885ce2f8") {
    found = true;
    passage_885ce2f8();
  }

  if (passageId === "4e9c58df") {
    found = true;
    passage_4e9c58df();
  }

  if (passageId === "198a1009") {
    found = true;
    passage_198a1009();
  }

  if (passageId === "e6c18fdb") {
    found = true;
    passage_e6c18fdb();
  }

  if (!found) {
    log(`No passage found for ${passageId}, does it have content?`);
  }
}

