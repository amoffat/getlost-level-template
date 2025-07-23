import * as host from "@gl/api/w2h/host";
import { String } from "@gl/types/i18n";
import * as twine from "@gl/utils/twine";
import * as level from "../main";

const log = host.debug.log;
const logError = host.debug.logError;
const interactButton = "interact";

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
  get params(): string[] {
    const params = new Array<string>();
    params.push("whyTown");
    params.push(this.whyTown.toString());
    params.push("whoSheikh");
    params.push(this.whoSheikh.toString());
    params.push("howJob");
    params.push(this.howJob.toString());
    params.push("guardWhat");
    params.push(this.guardWhat.toString());
    params.push("yourName");
    params.push(this.yourName.toString());
    return params;
  }
}

class State {
  upsetKnight: bool;
  learnedKnightStory: bool;
  knightOpts: State_knightOpts;
  constructor() {
    this.upsetKnight = false;
    this.learnedKnightStory = true;
    this.knightOpts = new State_knightOpts();
  }
  get params(): string[] {
    const params = new Array<string>();
    params.push("upsetKnight");
    params.push(this.upsetKnight.toString());
    params.push("learnedKnightStory");
    params.push(this.learnedKnightStory.toString());
    for (let i: i32 = 0; i < this.knightOpts.params.length; i += 2) {
      const name = this.knightOpts.params[i];
      const value = this.knightOpts.params[i + 1];
      params.push("knightOpts." + name);
      params.push(value);
    }
    return params;
  }
}

export const state = new State();

// If we're using an alias on our link, then we need to map from our shown
// choice id to our alias choice id.
const choiceToPassage = new Map<string, string>();
choiceToPassage.set("9251bf45", "3d787171");
choiceToPassage.set("58ba785b", "50c96f21");
choiceToPassage.set("698118b9", "a61db43e");
choiceToPassage.set("ed68fc3d", "5c07303d");
choiceToPassage.set("31ab4d0f", "2a9618c1");
choiceToPassage.set("3bc95ed3", "4306feba");
choiceToPassage.set("d188824d", "2a9618c1");
choiceToPassage.set("8bcf2e27", "4306feba");
choiceToPassage.set("1d925355", "e6c18fdb");
choiceToPassage.set("a97314c9", "e1ffb1d2");
choiceToPassage.set("24f43b0d", "491e88c5");
choiceToPassage.set("1fab6079", "c141faa8");
choiceToPassage.set("a07e8baa", "5ac45c94");
choiceToPassage.set("acf8dced", "aff68fcf");
choiceToPassage.set("ba1494d0", "d20fad6e");
choiceToPassage.set("42fcb639", "aff68fcf");
choiceToPassage.set("650209c4", "ff810fb6");
choiceToPassage.set("708ba768", "90212c36");
choiceToPassage.set("12283998", "e6c18fdb");
choiceToPassage.set("97c6c94d", "9b7360e5");
choiceToPassage.set("c0aa9943", "90212c36");
choiceToPassage.set("45e8a7dd", "50c96f21");

/**
 * Called when the player interacts with a choice dialog.
 *
 * @param passageId The id of the passage that the user interacted with.
 * @param passageId The id of the choice that the user made.
 */
export function choiceMadeEvent(passageId: string, choiceId: string): void {
  if (choiceId === "") {
    log(`Passage ${passageId} closed.`);
    level.dialogClosedEvent(passageId);
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
        label: interactButton,
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
  twine.incrementVisitCount("12890122");

  // "Be well."
  text = "aa225fe0";

  host.text.display("12890122", title, text, choices, state.params, animate);
}

// Show interact button for "Climb down"
export function stage_909a9cff(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: interactButton,
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
  twine.incrementVisitCount("909a9cff");

  if (twine.exit("well", true)) {
    return;
  }

  host.text.display("909a9cff", title, text, choices, state.params, animate);
}

// Show interact button for "Do you have a name?"
export function stage_562cd4ad(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: interactButton,
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
  twine.incrementVisitCount("562cd4ad");

  state.knightOpts.yourName = false;
  // "Sir Azure"
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

  host.text.display("562cd4ad", title, text, choices, state.params, animate);
}

// Show interact button for "Fire"
export function stage_Fire(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: interactButton,
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
  twine.incrementVisitCount("c141faa8");

  const objlit_1 = new Map<string, string>();
  objlit_1.set("type", "map");

  if (twine.hasPickup(objlit_1)) {
    // "You've found it... Please, give it to me..."
    text = "f4886e4d";
  } else {
    if (twine.visited("c141faa8") > 1) {
      // "You've returned."
      text = "dffd1999";
    } else {
      // "Greetings.... traveller..."
      text = "bbe687cd";
      // Who are you?
      choices.push("9251bf45");

      // Ignore the fire
      choices.push("690c49a8");
    }
  }

  host.text.display("c141faa8", title, text, choices, state.params, animate);
}

// Show interact button for "Give it a shot."
export function stage_15874eac(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: interactButton,
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
  twine.incrementVisitCount("15874eac");

  // "In the place where I'm from, we wouldn't be having this conversation because there is no you or I."
  text = "2aa61a95";
  // Gotcha...
  choices.push("c8a7d597");

  host.text.display("15874eac", title, text, choices, state.params, animate);
}

// Show interact button for "Gotcha..."
export function stage_c8a7d597(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: interactButton,
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
  twine.incrementVisitCount("c8a7d597");

  // "Anything else you'd like to know?"
  text = "4540b6fa";
  // You said you were seeking something?
  choices.push("58ba785b");

  host.text.display("c8a7d597", title, text, choices, state.params, animate);
}

// Show interact button for "Guard from what?"
export function stage_99e18287(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: interactButton,
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
  twine.incrementVisitCount("99e18287");

  state.knightOpts.guardWhat = false;
  // "That's not your concern."
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

  host.text.display("99e18287", title, text, choices, state.params, animate);
}

// Show interact button for "Hi Nazar, I'm $playerName."
export function stage_7d52fd29(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: interactButton,
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
  twine.incrementVisitCount("7d52fd29");

  // "I haven't seen you before, are you here with the Knight?"
  text = "159272d5";
  // What Knight?
  choices.push("698118b9");

  // Yes
  choices.push("ed68fc3d");

  host.text.display("7d52fd29", title, text, choices, state.params, animate);
}

// Show interact button for "How did you get this job?"
export function stage_379dcdf1(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: interactButton,
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
  twine.incrementVisitCount("379dcdf1");

  state.knightOpts.howJob = false;
  // "I.. uh... I volunteered. It's a long story, and I'm very busy right now."
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

  host.text.display("379dcdf1", title, text, choices, state.params, animate);
}

// Show interact button for "How long ago was this?"
export function stage_f6ded42f(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: interactButton,
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
  twine.incrementVisitCount("f6ded42f");

  // "Only a week ago."
  text = "dff1fa28";

  host.text.display("f6ded42f", title, text, choices, state.params, animate);
}

// Show interact button for "I found it up north."
export function stage_c503743a(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: interactButton,
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
  twine.incrementVisitCount("c503743a");

  // "I left it there. Give it to me."
  text = "1de8ad8f";
  if (twine.visited("ff810fb6")) {
    // I think I'll bring it to that fire on the water.
    choices.push("b2a5f392");
  }

  // No.
  choices.push("31ab4d0f");

  // Hand him the map
  choices.push("3bc95ed3");

  host.text.display("c503743a", title, text, choices, state.params, animate);
}

// Show interact button for "I know why you're here."
export function stage_a2b8560b(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: interactButton,
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
  twine.incrementVisitCount("a2b8560b");

  // "You talked to the old man..."
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

  host.text.display("a2b8560b", title, text, choices, state.params, animate);
}

// Show interact button for "I saw fire on the water."
export function stage_3ca52efa(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: interactButton,
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
  twine.incrementVisitCount("3ca52efa");

  // "You've lost your mind. Please go."
  text = "0ff99cc5";

  host.text.display("3ca52efa", title, text, choices, state.params, animate);
}

// Show interact button for "I'm...new here"
export function stage_559c302f(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: interactButton,
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
  twine.incrementVisitCount("559c302f");

  // "You are? Interesting..."
  text = "be1ca5bd";

  host.text.display("559c302f", title, text, choices, state.params, animate);
}

// Show interact button for "Kid"
export function stage_Omar(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: interactButton,
        slug: "passage/5ac45c94",
      },
    ]);
  } else {
    host.controls.setButtons([]);
  }
}

// "Kid"
export function passage_Omar(): void {
  // "Omar"
  const title = "2dd1283e";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  twine.incrementVisitCount("5ac45c94");

  // "It's pretty hot out here huh?"
  text = "66c542e0";

  host.text.display("5ac45c94", title, text, choices, state.params, animate);
}

// Show interact button for "Nazar"
export function stage_Nazar(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: interactButton,
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
  twine.incrementVisitCount("e1ffb1d2");

  if (twine.queryMarker("stole-fruit")) {
    // "I saw you take that fruit. I don't do business with thieves. Please leave."
    text = "623930a8";
  } else if (twine.isNight()) {
    // "I'd like to chat, but it's getting late. Come back during the day."
    text = "eb8848da";
  } else {
    if (twine.visited("e1ffb1d2") > 1) {
      // "Hello again."
      text = "18083266";
      // What's new?
      choices.push("623aab5c");
    } else {
      // "Welcome, I'm Nazar."
      text = "6bb62fa6";
      // Hi Nazar, I'm $playerName.
      choices.push("7d52fd29");
    }

    if (twine.visited("491e88c5")) {
      // What do you know about that knight?
      choices.push("f213214a");
    }

    if (twine.visited("c141faa8")) {
      // I saw fire on the water.
      choices.push("3ca52efa");
    }
  }

  host.text.display("e1ffb1d2", title, text, choices, state.params, animate);
}

// Show interact button for "None of your business"
export function stage_e0a2d72f(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: interactButton,
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
  twine.incrementVisitCount("e0a2d72f");

  // "Listen to me carefully. I'm getting that map."
  text = "2dd162b5";
  // Run away
  choices.push("d188824d");

  // Ok, calm down, here you go.
  choices.push("8bcf2e27");

  host.text.display("e0a2d72f", title, text, choices, state.params, animate);
}

// Show interact button for "Oh you mean the knight?"
export function stage_2ecf7f34(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: interactButton,
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
  twine.incrementVisitCount("2ecf7f34");

  // "The person I am seeking carries a map"
  text = "0d053e12";

  host.text.display("2ecf7f34", title, text, choices, state.params, animate);
}

// Show interact button for "Silent Knight"
export function stage_Knight(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: interactButton,
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
  twine.incrementVisitCount("491e88c5");

  const objlit_2 = new Map<string, string>();
  objlit_2.set("type", "map");

  if (twine.isNight()) {
    // "...zzzzz...zzzzz.....zzzz..."
    text = "b5cbd2a3";
  } else {
    if (twine.hasPickup(objlit_2)) {
      // "Where did you get that map?"
      text = "80251c82";
      // I found it up north.
      choices.push("c503743a");

      // None of your business
      choices.push("e0a2d72f");
    } else if (state.learnedKnightStory) {
      // "..."
      text = "ab5df625";
      // I know why you're here.
      choices.push("a2b8560b");
    } else if (state.upsetKnight) {
      // "I thought I said go away."
      text = "be9529b7";
    } else {
      // "..."
      text = "ab5df625";
      // Hi
      choices.push("1d925355");
    }
  }

  host.text.display("491e88c5", title, text, choices, state.params, animate);
}

// Show interact button for "Well"
export function stage_Well(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: interactButton,
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
  twine.incrementVisitCount("bdc7e965");

  // "There's a ladder going down, but you cannot see the bottom."
  text = "0e865942";
  // Climb down
  choices.push("909a9cff");

  // Step back
  choices.push("b863269e");

  host.text.display("bdc7e965", title, text, choices, state.params, animate);
}

// Show interact button for "What battle?"
export function stage_e45c4215(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: interactButton,
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
  twine.incrementVisitCount("e45c4215");

  // "You're really not from around here, are you? My people have been at war since before I was born."
  text = "e4657ad8";

  host.text.display("e45c4215", title, text, choices, state.params, animate);
}

// Show interact button for "What do you know about that knight?"
export function stage_f213214a(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: interactButton,
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
  twine.incrementVisitCount("f213214a");

  // "Well, I know he's not from around here. There was a battle. Then he showed up."
  text = "e245bb27";
  // What do you mean he showed up?
  choices.push("9d4f68e2");

  // What battle?
  choices.push("e45c4215");

  host.text.display("f213214a", title, text, choices, state.params, animate);
}

// Show interact button for "What do you mean he showed up?"
export function stage_9d4f68e2(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: interactButton,
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
  twine.incrementVisitCount("9d4f68e2");

  // "I mean he arrived on foot, without a weapon and covered in blood. We thought he left the battle to raid our village. But he had a letter from the Sheikh."
  text = "a7b6d713";
  // What did the letter say?
  choices.push("acf8dced");

  // Who is the Sheikh?
  choices.push("ba1494d0");

  host.text.display("9d4f68e2", title, text, choices, state.params, animate);
}

// Show interact button for "What is he guarding you from?"
export function stage_216c5e8c(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: interactButton,
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
  twine.incrementVisitCount("216c5e8c");

  // "You'll have to ask him."
  text = "7c1dac67";

  host.text.display("216c5e8c", title, text, choices, state.params, animate);
}

// Show interact button for "What's new?"
export function stage_623aab5c(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: interactButton,
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
  twine.incrementVisitCount("623aab5c");

  // "Not much."
  text = "88d44f50";

  host.text.display("623aab5c", title, text, choices, state.params, animate);
}

// Show interact button for "Where are you from?"
export function stage_63265a79(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: interactButton,
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
  twine.incrementVisitCount("63265a79");

  // "A different place. Your language lacks the words for it."
  text = "f304833e";
  // Give it a shot.
  choices.push("15874eac");

  host.text.display("63265a79", title, text, choices, state.params, animate);
}

// Show interact button for "Who is the Sheikh?"
export function stage_885ce2f8(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: interactButton,
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
  twine.incrementVisitCount("885ce2f8");

  state.knightOpts.whoSheikh = false;
  // "He sent me here to guard the town."
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

  host.text.display("885ce2f8", title, text, choices, state.params, animate);
}

// Show interact button for "Why are you guarding this town?"
export function stage_3c0aa10d(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: interactButton,
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
  twine.incrementVisitCount("3c0aa10d");

  state.knightOpts.whyTown = false;
  // "The Sheikh asked me to. That's all I can tell you."
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

  host.text.display("3c0aa10d", title, text, choices, state.params, animate);
}

// Show interact button for "nazar-who-shiekh"
export function stage_d20fad6e(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: interactButton,
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
  twine.incrementVisitCount("d20fad6e");

  // "The Sheikh created this village."
  text = "6c3f1cc4";
  // So what did the letter say?
  choices.push("42fcb639");

  host.text.display("d20fad6e", title, text, choices, state.params, animate);
}

// Show interact button for "observe-what"
export function stage_90212c36(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: interactButton,
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
  twine.incrementVisitCount("90212c36");

  // "I was told this village would be getting a new visitor."
  text = "b4c1d391";
  // I'm...new here
  choices.push("559c302f");

  // Oh you mean the knight?
  choices.push("2ecf7f34");

  host.text.display("90212c36", title, text, choices, state.params, animate);
}

// Show interact button for "seek-what"
export function stage_50c96f21(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: interactButton,
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
  twine.incrementVisitCount("50c96f21");

  // "A map..."
  text = "d6e3cd9f";
  // What's so special about a map?
  choices.push("650209c4");

  // You said you were observing? What?
  choices.push("708ba768");

  host.text.display("50c96f21", title, text, choices, state.params, animate);
}

// Show interact button for "silence"
export function stage_e6c18fdb(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: interactButton,
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
  twine.incrementVisitCount("e6c18fdb");

  // "..."
  text = "ab5df625";
  // *ahem*... I said 'Hi'
  choices.push("12283998");

  // Bye
  choices.push("97c6c94d");

  host.text.display("e6c18fdb", title, text, choices, state.params, animate);
}

// Show interact button for "special-map"
export function stage_ff810fb6(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: interactButton,
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
  twine.incrementVisitCount("ff810fb6");

  // "Find it for me and I'll show you."
  text = "092afab4";

  host.text.display("ff810fb6", title, text, choices, state.params, animate);
}

// Show interact button for "what-did-letter-say"
export function stage_aff68fcf(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: interactButton,
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
  twine.incrementVisitCount("aff68fcf");

  // "It said \"Give food and water to this soldier. In return he will guard the village.\" It had the Sheikh's seal. It was unmistakable."
  text = "f5654ac2";
  // How long ago was this?
  choices.push("f6ded42f");

  // When does the knight leave?
  choices.push("9b70a051");

  // What is he guarding you from?
  choices.push("216c5e8c");

  state.learnedKnightStory = true;

  host.text.display("aff68fcf", title, text, choices, state.params, animate);
}

// Show interact button for "what-knight"
export function stage_a61db43e(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: interactButton,
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
  twine.incrementVisitCount("a61db43e");

  // "There's a knight to the south. He doesn't talk much. Go see for yourself."
  text = "d95d75d7";

  host.text.display("a61db43e", title, text, choices, state.params, animate);
}

// Show interact button for "who-fire"
export function stage_3d787171(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: interactButton,
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
  twine.incrementVisitCount("3d787171");

  // "A fellow traveller.... I'm here to seek and observe."
  text = "15dd9ed6";
  // Where are you from?
  choices.push("63265a79");

  // Observe what?
  choices.push("c0aa9943");

  // What are you seeking?
  choices.push("45e8a7dd");

  host.text.display("3d787171", title, text, choices, state.params, animate);
}

// Show interact button for "yes-knight"
export function stage_5c07303d(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: interactButton,
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
  twine.incrementVisitCount("5c07303d");

  // "I see... let me know if you need anything. I'm here to help."
  text = "7ad97537";

  host.text.display("5c07303d", title, text, choices, state.params, animate);
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

  if (passageId === "5ac45c94") {
    found = true;
    passage_Omar();
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
