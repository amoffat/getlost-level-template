import * as host from "@gl/api/w2h/host";
import { String } from "@gl/types/i18n";
import * as timeUtils from "@gl/utils/time";
import * as userDialogue from "../main";

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

// If we're using an alias on our link, then we need to map from our shown
// choice id to our alias choice id.
const choiceToPassage = new Map<string, string>();
choiceToPassage.set("80495816", "3d787171");
choiceToPassage.set("141a8032", "50c96f21");
choiceToPassage.set("6451edb5", "a61db43e");
choiceToPassage.set("85a39ab3", "5c07303d");
choiceToPassage.set("38178a20", "2a9618c1");
choiceToPassage.set("8cf42533", "4306feba");
choiceToPassage.set("05e44e9b", "2a9618c1");
choiceToPassage.set("448fd9e9", "4306feba");
choiceToPassage.set("3639efcd", "e6c18fdb");
choiceToPassage.set("7fafd7d4", "e1ffb1d2");
choiceToPassage.set("dd146f7d", "491e88c5");
choiceToPassage.set("98bd5b29", "c141faa8");
choiceToPassage.set("e2092668", "aff68fcf");
choiceToPassage.set("885ce2f8", "d20fad6e");
choiceToPassage.set("c40b2d30", "aff68fcf");
choiceToPassage.set("255e6fab", "ff810fb6");
choiceToPassage.set("3e769b34", "90212c36");
choiceToPassage.set("41876c52", "e6c18fdb");
choiceToPassage.set("12890122", "9b7360e5");
choiceToPassage.set("813cdd9a", "90212c36");
choiceToPassage.set("b27a0c1e", "50c96f21");

function isNight(): bool {
  const ev = host.time.getSunEvent();
  return timeUtils.isNight(ev);
}

function isDay(): bool {
  const ev = host.time.getSunEvent();
  return timeUtils.isDay(ev);
}

export function visited(id: string): u32 {
  if (!visitCount.has(id)) {
    return 0;
  }
  const count = visitCount.get(id);
  return count;
}

export function hasVisited(id: string): bool {
  return visitCount.has(id);
}

export function lastVisited(passage: string): u32 {
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
      key: "interact",
      values: [
        {
          text: "Interact",
          lang: "en",
        },
      ],
    },

    {
      key: "3c0aa10d",
      values: [
        {
          text: "Why are you guarding this town?",
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
      key: "33dffa18",
      values: [
        {
          text: "map",
          lang: "en",
        },
      ],
    },

    {
      key: "f4886e4d",
      values: [
        {
          text: "You've found it... Please, give it to me...",
          lang: "en",
        },
      ],
    },

    {
      key: "dffd1999",
      values: [
        {
          text: "You've returned.",
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
      key: "690c49a8",
      values: [
        {
          text: "Ignore the fire",
          lang: "en",
        },
      ],
    },

    {
      key: "2aa61a95",
      values: [
        {
          text: "In the place where I'm from, we wouldn't be having this conversation because there is no you or I.",
          lang: "en",
        },
      ],
    },

    {
      key: "c8a7d597",
      values: [
        {
          text: "Gotcha...",
          lang: "en",
        },
      ],
    },

    {
      key: "4540b6fa",
      values: [
        {
          text: "Anything else you'd like to know?",
          lang: "en",
        },
      ],
    },

    {
      key: "141a8032",
      values: [
        {
          text: "You said you were seeking something?",
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
      key: "85a39ab3",
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
      key: "58544bd4",
      values: [
        {
          text: "special-map",
          lang: "en",
        },
      ],
    },

    {
      key: "b2a5f392",
      values: [
        {
          text: "I think I'll bring it to that fire on the water.",
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
      key: "8cf42533",
      values: [
        {
          text: "Hand him the map",
          lang: "en",
        },
      ],
    },

    {
      key: "aa053912",
      values: [
        {
          text: "You talked to the old man...",
          lang: "en",
        },
      ],
    },

    {
      key: "0ff99cc5",
      values: [
        {
          text: "You've lost your mind. Please go.",
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
      key: "eb8848da",
      values: [
        {
          text: "I'd like to chat, but it's getting late. Come back during the day.",
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
      key: "6bb62fa6",
      values: [
        {
          text: "Welcome, I'm Nazar.",
          lang: "en",
        },
      ],
    },

    {
      key: "7d52fd29",
      values: [
        {
          text: "Hi Nazar, I'm $playerName.",
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
      key: "3ca52efa",
      values: [
        {
          text: "I saw fire on the water.",
          lang: "en",
        },
      ],
    },

    {
      key: "2dd162b5",
      values: [
        {
          text: "Listen to me carefully. I'm getting that map.",
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
      key: "448fd9e9",
      values: [
        {
          text: "Ok, calm down, here you go.",
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
      key: "b5cbd2a3",
      values: [
        {
          text: "...zzzzz...zzzzz.....zzzz...",
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
      key: "c503743a",
      values: [
        {
          text: "I found it up north.",
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
      key: "7fafd7d4",
      values: [
        {
          text: "Talk to Nazar",
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
      key: "98bd5b29",
      values: [
        {
          text: "Talk to Fire",
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
      key: "e4657ad8",
      values: [
        {
          text: "You're really not from around here, are you? My people have been at war since before I was born.",
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
      key: "f304833e",
      values: [
        {
          text: "A different place. Your language lacks the words for it.",
          lang: "en",
        },
      ],
    },

    {
      key: "15874eac",
      values: [
        {
          text: "Give it a shot.",
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
      key: "d6e3cd9f",
      values: [
        {
          text: "A map...",
          lang: "en",
        },
      ],
    },

    {
      key: "255e6fab",
      values: [
        {
          text: "What's so special about a map?",
          lang: "en",
        },
      ],
    },

    {
      key: "3e769b34",
      values: [
        {
          text: "You said you were observing? What?",
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
      key: "092afab4",
      values: [
        {
          text: "Find it for me and I'll show you.",
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
      key: "15dd9ed6",
      values: [
        {
          text: "A fellow traveller.... I'm here to seek and observe.",
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
      key: "b27a0c1e",
      values: [
        {
          text: "What are you seeking?",
          lang: "en",
        },
      ],
    },

    {
      key: "7ad97537",
      values: [
        {
          text: "I see... let me know if you need anything. I'm here to help.",
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
      key: "c141faa8",
      values: [
        {
          text: "Fire",
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
  ];
}

/**
 * Called when the player interacts with a choice dialog.
 *
 * @param passageId The id of the passage that the user interacted with.
 * @param passageId The id of the choice that the user made.
 */
export function choiceMadeEvent(passageId: string, choiceId: string): void {
  if (choiceId === "") {
    log(`Passage ${passageId} closed.`);
    userDialogue.dialogClosedEvent(passageId);
    return;
  }
  log(`Choice made for ${passageId}: ${choiceId}`);
  if (choiceToPassage.has(choiceId)) {
    choiceId = choiceToPassage.get(choiceId);
  }
  dispatch(choiceId);
}

// Show interact button for "Bye"
export function stage_12890122(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: "interact",
        slug: "passage/12890122",
      },
    ]);
  } else {
    host.controls.setButtons([]);
  }
}

// "Bye"
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
    host.text.display("12890122", title, text, choices, params, animate);
  }
}

// Show interact button for "Climb down"
export function stage_909a9cff(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: "interact",
        slug: "passage/909a9cff",
      },
    ]);
  } else {
    host.controls.setButtons([]);
  }
}

// "Climb down"
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
    host.text.display("909a9cff", title, text, choices, params, animate);
  }
}

// Show interact button for "Do you have a name?"
export function stage_562cd4ad(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: "interact",
        slug: "passage/562cd4ad",
      },
    ]);
  } else {
    host.controls.setButtons([]);
  }
}

// "Do you have a name?"
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
    // Why are you guarding this town?
    choices.push("3c0aa10d");
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
    host.text.display("562cd4ad", title, text, choices, params, animate);
  }
}

// Show interact button for "Fire"
export function stage_Fire(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: "interact",
        slug: "passage/c141faa8",
      },
    ]);
  } else {
    host.controls.setButtons([]);
  }
}

// "Fire"
export function passage_Fire(): void {
  // "Fire"
  const title = "c141faa8";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();
  incrementVisitCount("c141faa8");

  const pickup_tags_1 = new Array<string>();
  pickup_tags_1.push("type");
  pickup_tags_1.push("map");

  if (host.pickup.get(pickup_tags_1).length > 0) {
    // You've found it... Please, give it to me...
    text = "f4886e4d";
  } else {
    if (visited("c141faa8") > 1) {
      // You've returned.
      text = "dffd1999";
    } else {
      // Greetings.... traveller...
      text = "bbe687cd";
      // Who are you?
      choices.push("80495816");
      // Ignore the fire
      choices.push("690c49a8");
    }
  }

  if (text.length > 0) {
    host.text.display("c141faa8", title, text, choices, params, animate);
  }
}

// Show interact button for "Give it a shot."
export function stage_15874eac(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: "interact",
        slug: "passage/15874eac",
      },
    ]);
  } else {
    host.controls.setButtons([]);
  }
}

// "Give it a shot."
export function passage_15874eac(): void {
  // "Fire"
  const title = "c141faa8";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();
  incrementVisitCount("15874eac");

  // In the place where I'm from, we wouldn't be having this conversation because there is no you or I.
  text = "2aa61a95";
  // Gotcha...
  choices.push("c8a7d597");

  if (text.length > 0) {
    host.text.display("15874eac", title, text, choices, params, animate);
  }
}

// Show interact button for "Gotcha..."
export function stage_c8a7d597(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: "interact",
        slug: "passage/c8a7d597",
      },
    ]);
  } else {
    host.controls.setButtons([]);
  }
}

// "Gotcha..."
export function passage_c8a7d597(): void {
  // "Fire"
  const title = "c141faa8";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();
  incrementVisitCount("c8a7d597");

  // Anything else you'd like to know?
  text = "4540b6fa";
  // You said you were seeking something?
  choices.push("141a8032");

  if (text.length > 0) {
    host.text.display("c8a7d597", title, text, choices, params, animate);
  }
}

// Show interact button for "Guard from what?"
export function stage_99e18287(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: "interact",
        slug: "passage/99e18287",
      },
    ]);
  } else {
    host.controls.setButtons([]);
  }
}

// "Guard from what?"
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
    // Why are you guarding this town?
    choices.push("3c0aa10d");
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
    host.text.display("99e18287", title, text, choices, params, animate);
  }
}

// Show interact button for "Hi Nazar, I'm $playerName."
export function stage_7d52fd29(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: "interact",
        slug: "passage/7d52fd29",
      },
    ]);
  } else {
    host.controls.setButtons([]);
  }
}

// "Hi Nazar, I'm $playerName."
export function passage_7d52fd29(): void {
  // "Nazar"
  const title = "e1ffb1d2";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();
  incrementVisitCount("7d52fd29");

  // I haven't seen you before, are you here with the Knight?
  text = "159272d5";
  // What Knight?
  choices.push("6451edb5");
  // Yes
  choices.push("85a39ab3");

  if (text.length > 0) {
    host.text.display("7d52fd29", title, text, choices, params, animate);
  }
}

// Show interact button for "How did you get this job?"
export function stage_379dcdf1(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: "interact",
        slug: "passage/379dcdf1",
      },
    ]);
  } else {
    host.controls.setButtons([]);
  }
}

// "How did you get this job?"
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
    // Why are you guarding this town?
    choices.push("3c0aa10d");
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
    host.text.display("379dcdf1", title, text, choices, params, animate);
  }
}

// Show interact button for "How long ago was this?"
export function stage_f6ded42f(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: "interact",
        slug: "passage/f6ded42f",
      },
    ]);
  } else {
    host.controls.setButtons([]);
  }
}

// "How long ago was this?"
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
    host.text.display("f6ded42f", title, text, choices, params, animate);
  }
}

// Show interact button for "I found it up north."
export function stage_c503743a(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: "interact",
        slug: "passage/c503743a",
      },
    ]);
  } else {
    host.controls.setButtons([]);
  }
}

// "I found it up north."
export function passage_c503743a(): void {
  // "Knight"
  const title = "f24b5246";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();
  incrementVisitCount("c503743a");

  // I left it there. Give it to me.
  text = "1de8ad8f";
  if (visited("ff810fb6")) {
    // I think I'll bring it to that fire on the water.
    choices.push("b2a5f392");
  }
  // No.
  choices.push("38178a20");
  // Hand him the map
  choices.push("8cf42533");

  if (text.length > 0) {
    host.text.display("c503743a", title, text, choices, params, animate);
  }
}

// Show interact button for "I know why you're here."
export function stage_a2b8560b(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: "interact",
        slug: "passage/a2b8560b",
      },
    ]);
  } else {
    host.controls.setButtons([]);
  }
}

// "I know why you're here."
export function passage_a2b8560b(): void {
  // "Knight"
  const title = "f24b5246";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();
  incrementVisitCount("a2b8560b");

  // You talked to the old man...
  text = "aa053912";

  if (state.knightOpts.whyTown) {
    // Why are you guarding this town?
    choices.push("3c0aa10d");
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
    host.text.display("a2b8560b", title, text, choices, params, animate);
  }
}

// Show interact button for "I saw fire on the water."
export function stage_3ca52efa(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: "interact",
        slug: "passage/3ca52efa",
      },
    ]);
  } else {
    host.controls.setButtons([]);
  }
}

// "I saw fire on the water."
export function passage_3ca52efa(): void {
  // "Nazar"
  const title = "e1ffb1d2";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();
  incrementVisitCount("3ca52efa");

  // You've lost your mind. Please go.
  text = "0ff99cc5";

  if (text.length > 0) {
    host.text.display("3ca52efa", title, text, choices, params, animate);
  }
}

// Show interact button for "I'm...new here"
export function stage_559c302f(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: "interact",
        slug: "passage/559c302f",
      },
    ]);
  } else {
    host.controls.setButtons([]);
  }
}

// "I'm...new here"
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
    host.text.display("559c302f", title, text, choices, params, animate);
  }
}

// Show interact button for "Nazar"
export function stage_Nazar(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: "interact",
        slug: "passage/e1ffb1d2",
      },
    ]);
  } else {
    host.controls.setButtons([]);
  }
}

// "Nazar"
export function passage_Nazar(): void {
  // "Nazar"
  const title = "e1ffb1d2";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();
  incrementVisitCount("e1ffb1d2");

  if (isNight()) {
    // I'd like to chat, but it's getting late. Come back during the day.
    text = "eb8848da";
  } else {
    if (visited("e1ffb1d2") > 1) {
      // Hello again.
      text = "18083266";
      // What's new?
      choices.push("623aab5c");
    } else {
      // Welcome, I'm Nazar.
      text = "6bb62fa6";
      // Hi Nazar, I'm $playerName.
      choices.push("7d52fd29");
    }
    if (visited("491e88c5")) {
      // What do you know about that knight?
      choices.push("f213214a");
    }
    if (visited("c141faa8")) {
      // I saw fire on the water.
      choices.push("3ca52efa");
    }
  }

  if (text.length > 0) {
    host.text.display("e1ffb1d2", title, text, choices, params, animate);
  }
}

// Show interact button for "None of your business"
export function stage_e0a2d72f(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: "interact",
        slug: "passage/e0a2d72f",
      },
    ]);
  } else {
    host.controls.setButtons([]);
  }
}

// "None of your business"
export function passage_e0a2d72f(): void {
  // "Knight"
  const title = "f24b5246";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();
  incrementVisitCount("e0a2d72f");

  // Listen to me carefully. I'm getting that map.
  text = "2dd162b5";
  // Run away
  choices.push("05e44e9b");
  // Ok, calm down, here you go.
  choices.push("448fd9e9");

  if (text.length > 0) {
    host.text.display("e0a2d72f", title, text, choices, params, animate);
  }
}

// Show interact button for "Oh you mean the knight?"
export function stage_2ecf7f34(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: "interact",
        slug: "passage/2ecf7f34",
      },
    ]);
  } else {
    host.controls.setButtons([]);
  }
}

// "Oh you mean the knight?"
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
    host.text.display("2ecf7f34", title, text, choices, params, animate);
  }
}

// Show interact button for "Silent Knight"
export function stage_Knight(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: "interact",
        slug: "passage/491e88c5",
      },
    ]);
  } else {
    host.controls.setButtons([]);
  }
}

// "Silent Knight"
export function passage_Knight(): void {
  // "Knight"
  const title = "f24b5246";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();
  incrementVisitCount("491e88c5");

  const pickup_tags_2 = new Array<string>();
  pickup_tags_2.push("type");
  pickup_tags_2.push("map");

  if (isNight()) {
    // ...zzzzz...zzzzz.....zzzz...
    text = "b5cbd2a3";
  } else {
    if (host.pickup.get(pickup_tags_2).length > 0) {
      // Where did you get that map?
      text = "80251c82";
      // I found it up north.
      choices.push("c503743a");
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
      choices.push("3639efcd");
    }
  }

  if (text.length > 0) {
    host.text.display("491e88c5", title, text, choices, params, animate);
  }
}

// Show interact button for "Well"
export function stage_Well(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: "interact",
        slug: "passage/bdc7e965",
      },
    ]);
  } else {
    host.controls.setButtons([]);
  }
}

// "Well"
export function passage_Well(): void {
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
    host.text.display("bdc7e965", title, text, choices, params, animate);
  }
}

// Show interact button for "What battle?"
export function stage_e45c4215(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: "interact",
        slug: "passage/e45c4215",
      },
    ]);
  } else {
    host.controls.setButtons([]);
  }
}

// "What battle?"
export function passage_e45c4215(): void {
  // "Nazar"
  const title = "e1ffb1d2";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();
  incrementVisitCount("e45c4215");

  // You're really not from around here, are you? My people have been at war since before I was born.
  text = "e4657ad8";

  if (text.length > 0) {
    host.text.display("e45c4215", title, text, choices, params, animate);
  }
}

// Show interact button for "What do you know about that knight?"
export function stage_f213214a(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: "interact",
        slug: "passage/f213214a",
      },
    ]);
  } else {
    host.controls.setButtons([]);
  }
}

// "What do you know about that knight?"
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
    host.text.display("f213214a", title, text, choices, params, animate);
  }
}

// Show interact button for "What do you mean he showed up?"
export function stage_9d4f68e2(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: "interact",
        slug: "passage/9d4f68e2",
      },
    ]);
  } else {
    host.controls.setButtons([]);
  }
}

// "What do you mean he showed up?"
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
  choices.push("e2092668");
  // Who is the Sheikh?
  choices.push("885ce2f8");

  if (text.length > 0) {
    host.text.display("9d4f68e2", title, text, choices, params, animate);
  }
}

// Show interact button for "What is he guarding you from?"
export function stage_216c5e8c(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: "interact",
        slug: "passage/216c5e8c",
      },
    ]);
  } else {
    host.controls.setButtons([]);
  }
}

// "What is he guarding you from?"
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
    host.text.display("216c5e8c", title, text, choices, params, animate);
  }
}

// Show interact button for "What's new?"
export function stage_623aab5c(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: "interact",
        slug: "passage/623aab5c",
      },
    ]);
  } else {
    host.controls.setButtons([]);
  }
}

// "What's new?"
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
    host.text.display("623aab5c", title, text, choices, params, animate);
  }
}

// Show interact button for "Where are you from?"
export function stage_63265a79(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: "interact",
        slug: "passage/63265a79",
      },
    ]);
  } else {
    host.controls.setButtons([]);
  }
}

// "Where are you from?"
export function passage_63265a79(): void {
  // "Fire"
  const title = "c141faa8";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();
  incrementVisitCount("63265a79");

  // A different place. Your language lacks the words for it.
  text = "f304833e";
  // Give it a shot.
  choices.push("15874eac");

  if (text.length > 0) {
    host.text.display("63265a79", title, text, choices, params, animate);
  }
}

// Show interact button for "Who is the Sheikh?"
export function stage_885ce2f8(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: "interact",
        slug: "passage/885ce2f8",
      },
    ]);
  } else {
    host.controls.setButtons([]);
  }
}

// "Who is the Sheikh?"
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
    // Why are you guarding this town?
    choices.push("3c0aa10d");
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
    host.text.display("885ce2f8", title, text, choices, params, animate);
  }
}

// Show interact button for "Why are you guarding this town?"
export function stage_3c0aa10d(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: "interact",
        slug: "passage/3c0aa10d",
      },
    ]);
  } else {
    host.controls.setButtons([]);
  }
}

// "Why are you guarding this town?"
export function passage_3c0aa10d(): void {
  // "Knight"
  const title = "f24b5246";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();
  incrementVisitCount("3c0aa10d");

  state.knightOpts.whyTown = false;
  // The Sheikh asked me to. That's all I can tell you.
  text = "76f7e319";
  if (state.knightOpts.whyTown) {
    // Why are you guarding this town?
    choices.push("3c0aa10d");
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
    host.text.display("3c0aa10d", title, text, choices, params, animate);
  }
}

// Show interact button for "nazar-who-shiekh"
export function stage_d20fad6e(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: "interact",
        slug: "passage/d20fad6e",
      },
    ]);
  } else {
    host.controls.setButtons([]);
  }
}

// "nazar-who-shiekh"
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
  choices.push("c40b2d30");

  if (text.length > 0) {
    host.text.display("d20fad6e", title, text, choices, params, animate);
  }
}

// Show interact button for "observe-what"
export function stage_90212c36(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: "interact",
        slug: "passage/90212c36",
      },
    ]);
  } else {
    host.controls.setButtons([]);
  }
}

// "observe-what"
export function passage_90212c36(): void {
  // "Fire"
  const title = "c141faa8";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();
  incrementVisitCount("90212c36");

  // I was told this village would be getting a new visitor.
  text = "b4c1d391";
  // I'm...new here
  choices.push("559c302f");
  // Oh you mean the knight?
  choices.push("2ecf7f34");

  if (text.length > 0) {
    host.text.display("90212c36", title, text, choices, params, animate);
  }
}

// Show interact button for "seek-what"
export function stage_50c96f21(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: "interact",
        slug: "passage/50c96f21",
      },
    ]);
  } else {
    host.controls.setButtons([]);
  }
}

// "seek-what"
export function passage_50c96f21(): void {
  // "Fire"
  const title = "c141faa8";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();
  incrementVisitCount("50c96f21");

  // A map...
  text = "d6e3cd9f";
  // What's so special about a map?
  choices.push("255e6fab");
  // You said you were observing? What?
  choices.push("3e769b34");

  if (text.length > 0) {
    host.text.display("50c96f21", title, text, choices, params, animate);
  }
}

// Show interact button for "silence"
export function stage_e6c18fdb(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: "interact",
        slug: "passage/e6c18fdb",
      },
    ]);
  } else {
    host.controls.setButtons([]);
  }
}

// "silence"
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
  choices.push("12890122");

  if (text.length > 0) {
    host.text.display("e6c18fdb", title, text, choices, params, animate);
  }
}

// Show interact button for "special-map"
export function stage_ff810fb6(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: "interact",
        slug: "passage/ff810fb6",
      },
    ]);
  } else {
    host.controls.setButtons([]);
  }
}

// "special-map"
export function passage_ff810fb6(): void {
  // "Fire"
  const title = "c141faa8";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();
  incrementVisitCount("ff810fb6");

  // Find it for me and I'll show you.
  text = "092afab4";

  if (text.length > 0) {
    host.text.display("ff810fb6", title, text, choices, params, animate);
  }
}

// Show interact button for "what-did-letter-say"
export function stage_aff68fcf(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: "interact",
        slug: "passage/aff68fcf",
      },
    ]);
  } else {
    host.controls.setButtons([]);
  }
}

// "what-did-letter-say"
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
    host.text.display("aff68fcf", title, text, choices, params, animate);
  }
}

// Show interact button for "what-knight"
export function stage_a61db43e(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: "interact",
        slug: "passage/a61db43e",
      },
    ]);
  } else {
    host.controls.setButtons([]);
  }
}

// "what-knight"
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
    host.text.display("a61db43e", title, text, choices, params, animate);
  }
}

// Show interact button for "who-fire"
export function stage_3d787171(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: "interact",
        slug: "passage/3d787171",
      },
    ]);
  } else {
    host.controls.setButtons([]);
  }
}

// "who-fire"
export function passage_3d787171(): void {
  // "Fire"
  const title = "c141faa8";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();
  incrementVisitCount("3d787171");

  // A fellow traveller.... I'm here to seek and observe.
  text = "15dd9ed6";
  // Where are you from?
  choices.push("63265a79");
  // Observe what?
  choices.push("813cdd9a");
  // What are you seeking?
  choices.push("b27a0c1e");

  if (text.length > 0) {
    host.text.display("3d787171", title, text, choices, params, animate);
  }
}

// Show interact button for "yes-knight"
export function stage_5c07303d(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: "interact",
        slug: "passage/5c07303d",
      },
    ]);
  } else {
    host.controls.setButtons([]);
  }
}

// "yes-knight"
export function passage_5c07303d(): void {
  // "Nazar"
  const title = "e1ffb1d2";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  const params = new Map<string, string>();
  incrementVisitCount("5c07303d");

  // I see... let me know if you need anything. I'm here to help.
  text = "7ad97537";

  if (text.length > 0) {
    host.text.display("5c07303d", title, text, choices, params, animate);
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
    passage_Fire();
  }

  if (passageId === "15874eac") {
    found = true;
    passage_15874eac();
  }

  if (passageId === "c8a7d597") {
    found = true;
    passage_c8a7d597();
  }

  if (passageId === "99e18287") {
    found = true;
    passage_99e18287();
  }

  if (passageId === "7d52fd29") {
    found = true;
    passage_7d52fd29();
  }

  if (passageId === "379dcdf1") {
    found = true;
    passage_379dcdf1();
  }

  if (passageId === "f6ded42f") {
    found = true;
    passage_f6ded42f();
  }

  if (passageId === "c503743a") {
    found = true;
    passage_c503743a();
  }

  if (passageId === "a2b8560b") {
    found = true;
    passage_a2b8560b();
  }

  if (passageId === "3ca52efa") {
    found = true;
    passage_3ca52efa();
  }

  if (passageId === "559c302f") {
    found = true;
    passage_559c302f();
  }

  if (passageId === "e1ffb1d2") {
    found = true;
    passage_Nazar();
  }

  if (passageId === "e0a2d72f") {
    found = true;
    passage_e0a2d72f();
  }

  if (passageId === "2ecf7f34") {
    found = true;
    passage_2ecf7f34();
  }

  if (passageId === "491e88c5") {
    found = true;
    passage_Knight();
  }

  if (passageId === "bdc7e965") {
    found = true;
    passage_Well();
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

  if (passageId === "3c0aa10d") {
    found = true;
    passage_3c0aa10d();
  }

  if (passageId === "d20fad6e") {
    found = true;
    passage_d20fad6e();
  }

  if (passageId === "90212c36") {
    found = true;
    passage_90212c36();
  }

  if (passageId === "50c96f21") {
    found = true;
    passage_50c96f21();
  }

  if (passageId === "e6c18fdb") {
    found = true;
    passage_e6c18fdb();
  }

  if (passageId === "ff810fb6") {
    found = true;
    passage_ff810fb6();
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

