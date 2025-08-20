import * as host from "@gl/api/w2h/host";
import { log } from "@gl/api/w2h/host";
import { String } from "@gl/types/i18n";
import * as twine from "@gl/utils/twine";
import * as level from "../main";

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
  kidHasWater: bool;
  title: string;
  knightOpts: State_knightOpts;
  constructor() {
    this.upsetKnight = false;
    this.learnedKnightStory = false;
    this.kidHasWater = true;
    this.title = "Skelly's Lair";
    this.knightOpts = new State_knightOpts();
  }
  get params(): string[] {
    const params = new Array<string>();
    params.push("upsetKnight");
    params.push(this.upsetKnight.toString());
    params.push("learnedKnightStory");
    params.push(this.learnedKnightStory.toString());
    params.push("kidHasWater");
    params.push(this.kidHasWater.toString());
    params.push("title");
    params.push(this.title.toString());
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
choiceToPassage.set("44d8d469", "50c96f21");
choiceToPassage.set("9251bf45", "3d787171");
choiceToPassage.set("698118b9", "a61db43e");
choiceToPassage.set("ed68fc3d", "5c07303d");
choiceToPassage.set("d188824d", "2a9618c1");
choiceToPassage.set("8bcf2e27", "4306feba");
choiceToPassage.set("1d925355", "e6c18fdb");
choiceToPassage.set("650209c4", "ff810fb6");
choiceToPassage.set("708ba768", "90212c36");
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
    log.info(`Passage ${passageId} closed.`);
    level.dialogClosedEvent(passageId);
    return;
  }
  log.info(`Choice made for ${passageId}: ${choiceId}`);
  if (choiceToPassage.has(choiceId)) {
    choiceId = choiceToPassage.get(choiceId);
  }
  dispatch(choiceId);
}

// Show interact button for "*psst*...why are you here?"
export function stage_e060e278(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: interactButton,
        slug: "passage/e060e278",
      },
    ]);
  } else {
    host.controls.setButtons([]);
  }
}

// "*psst*...why are you here?"
export function passage_e060e278(): void {
  // "Knight"
  const title = "f24b5246";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  twine.incrementVisitCount("e060e278");

  // "..zzz...zz... guard the map... zzzz...."
  text = "6094e0ff";
  // Where is the map?
  choices.push("a4c9f0e6");

  host.text.display("e060e278", title, text, choices, state.params, animate);
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

// Show interact button for "Can I get some water please?"
export function stage_1ce6844d(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: interactButton,
        slug: "passage/1ce6844d",
      },
    ]);
  } else {
    host.controls.setButtons([]);
  }
}

// "Can I get some water please?"
export function passage_1ce6844d(): void {
  // "Omar"
  const title = "2dd1283e";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  twine.incrementVisitCount("1ce6844d");

  if (state.kidHasWater) {
    if (twine.hasVisited("1ce6844d")) {
      // "This is the last of my water. There's an oasis to the east. That can cool you off too."
      text = "63edc718";
      state.kidHasWater = false;
    } else {
      // "Here, this water should cool you down. I don't have much."
      text = "a15f40ff";
    }

    level.reduceOverheatBy(0.5);
  } else {
    // "Sorry! Go to the oasis, quick!"
    text = "7376aa01";
  }

  host.text.display("1ce6844d", title, text, choices, state.params, animate);
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

// Show interact button for "Draw water"
export function stage_857ccfa7(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: interactButton,
        slug: "passage/857ccfa7",
      },
    ]);
  } else {
    host.controls.setButtons([]);
  }
}

// "Draw water"
export function passage_857ccfa7(): void {
  // "Well"
  const title = "bdc7e965";
  const animate = false;
  let text = "";
  const choices: string[] = [];
  twine.incrementVisitCount("857ccfa7");

  // "The water is ice cold and cools you off."
  text = "40345826";
  level.reduceOverheatBy(0.5);

  host.text.display("857ccfa7", title, text, choices, state.params, animate);
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

  if (twine.hasPickup("map")) {
    // "You've found the map... Please, take me with you..."
    text = "e4462448";
    // Take  you with me?
    choices.push("3c06e3e9");
  } else {
    if (twine.hasVisited("c141faa8")) {
      // "You've returned to me..."
      text = "d11cfd4f";
      // What is it that you're looking for again?
      choices.push("44d8d469");
    } else {
      // "Greetings.... traveller..."
      text = "bbe687cd";
      // Who are you?
      choices.push("9251bf45");
    }
  }

  host.text.display("c141faa8", title, text, choices, state.params, animate);
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

// Show interact button for "Heat"
export function stage_DeathSpiralDesert(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: interactButton,
        slug: "passage/ee255635",
      },
    ]);
  } else {
    host.controls.setButtons([]);
  }
}

// "Heat"
export function passage_DeathSpiralDesert(): void {
  // "Death Spiral Desert"
  const title = "fa245957";
  const animate = false;
  let text = "";
  const choices: string[] = [];
  twine.incrementVisitCount("ee255635");

  // "CAUTION: Extreme daytime temperatures. Enter at your own risk."
  text = "537d4b4a";

  host.text.display("ee255635", title, text, choices, state.params, animate);
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

// Show interact button for "Home invasion"
export function stage_Amina(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: interactButton,
        slug: "passage/d3e682fd",
      },
    ]);
  } else {
    host.controls.setButtons([]);
  }
}

// "Home invasion"
export function passage_Amina(): void {
  // "Amina"
  const title = "7efe9a72";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  twine.incrementVisitCount("d3e682fd");

  // "Hey, get out of here! This is my house!"
  text = "dba49dce";
  twine.recordMarker("privacy-invasion");

  host.text.display("d3e682fd", title, text, choices, state.params, animate);
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

// Show interact button for "I didn't take anything."
export function stage_eb8d0d59(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: interactButton,
        slug: "passage/eb8d0d59",
      },
    ]);
  } else {
    host.controls.setButtons([]);
  }
}

// "I didn't take anything."
export function passage_eb8d0d59(): void {
  // "Nazar"
  const title = "e1ffb1d2";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  twine.incrementVisitCount("eb8d0d59");

  // "Oh, so you're a liar as well as a thief?"
  text = "c59b89a3";
  twine.recordMarker("lied-about-stealing");

  host.text.display("eb8d0d59", title, text, choices, state.params, animate);
}

// Show interact button for "I found it in the desert."
export function stage_fe36d6fe(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: interactButton,
        slug: "passage/fe36d6fe",
      },
    ]);
  } else {
    host.controls.setButtons([]);
  }
}

// "I found it in the desert."
export function passage_fe36d6fe(): void {
  // "Knight"
  const title = "f24b5246";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  twine.incrementVisitCount("fe36d6fe");

  // "Listen to me carefully. You are in grave danger."
  text = "15380c5d";
  if (twine.visited("ff810fb6")) {
    // I think I'll bring it to that fire on the water.
    choices.push("b2a5f392");
  }

  // How am I in danger?
  choices.push("f8b71c7d");

  host.text.display("fe36d6fe", title, text, choices, state.params, animate);
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

// Show interact button for "I said 'Hi'"
export function stage_a37124ea(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: interactButton,
        slug: "passage/a37124ea",
      },
    ]);
  } else {
    host.controls.setButtons([]);
  }
}

// "I said 'Hi'"
export function passage_a37124ea(): void {
  // "Knight"
  const title = "f24b5246";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  twine.incrementVisitCount("a37124ea");

  // "Unless you're here to bring me an ice cold beverage, you can buzz off."
  text = "6d5fab16";

  host.text.display("a37124ea", title, text, choices, state.params, animate);
}

// Show interact button for "I saw a blue fire on the water."
export function stage_f510d9c0(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: interactButton,
        slug: "passage/f510d9c0",
      },
    ]);
  } else {
    host.controls.setButtons([]);
  }
}

// "I saw a blue fire on the water."
export function passage_f510d9c0(): void {
  // "Nazar"
  const title = "e1ffb1d2";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  twine.incrementVisitCount("f510d9c0");

  // "You've lost your mind. Please go."
  text = "0ff99cc5";

  host.text.display("f510d9c0", title, text, choices, state.params, animate);
}

// Show interact button for "I was hungry."
export function stage_d62c3967(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: interactButton,
        slug: "passage/d62c3967",
      },
    ]);
  } else {
    host.controls.setButtons([]);
  }
}

// "I was hungry."
export function passage_d62c3967(): void {
  // "Nazar"
  const title = "e1ffb1d2";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  twine.incrementVisitCount("d62c3967");

  // "Hmph."
  text = "10dea114";

  host.text.display("d62c3967", title, text, choices, state.params, animate);
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

  if (twine.isDay()) {
    if (twine.queryMarker("died-overheated")) {
      // "Did you try to get the map? You shouldn't go out there during the day."
      text = "70fc677a";
    } else if (state.kidHasWater) {
      // "It's pretty hot out here huh? I have some water if you start to overheat."
      text = "3f243df9";
      if (level.overheat >= 0.2) {
        // Can I get some water please?
        choices.push("1ce6844d");

        // Thanks, but I'm ok.
        choices.push("1c802db9");
      }
    } else {
    }
  } else {
    if (twine.hasPickup("map")) {
      // "It's much cooler at night, yeah?"
      text = "3b74846b";
    } else {
      // "It's much cooler at night, yeah? I bet you could get that map now."
      text = "2ff1fead";
    }
  }

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
    // I didn't take anything.
    choices.push("eb8d0d59");

    // I was hungry.
    choices.push("d62c3967");
  } else if (twine.isNight()) {
    // "I'd like to chat, but it's getting late. Come back during the day."
    text = "eb8848da";
  } else {
    if (twine.hasVisited("e1ffb1d2")) {
      // "Hello again."
      text = "18083266";
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
      // I saw a blue fire on the water.
      choices.push("f510d9c0");
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

  // "Listen to me carefully. You need to give me that map."
  text = "b84a575a";
  // Run away
  choices.push("d188824d");

  // Ok, calm down, here you go.
  choices.push("8bcf2e27");

  host.text.display("e0a2d72f", title, text, choices, state.params, animate);
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

  if (twine.isNight()) {
    // "...zzzzz...zzzzz.....zzzz..."
    text = "b5cbd2a3";
    // *psst*...why are you here?
    choices.push("e060e278");
  } else {
    if (twine.hasPickup("map")) {
      // "Hey, come here! Where did you get that map???"
      text = "6fc1c591";
      // I found it in the desert.
      choices.push("fe36d6fe");

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

// Show interact button for "Skull Door"
export function stage_SkellysLair(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: interactButton,
        slug: "passage/c237deff",
      },
    ]);
  } else {
    host.controls.setButtons([]);
  }
}

// "Skull Door"
export function passage_SkellysLair(): void {
  // "Skelly's Lair"
  const title = "1e5553aa";
  const animate = false;
  let text = "";
  const choices: string[] = [];
  twine.incrementVisitCount("c237deff");

  // "Celebration is by invitation only.\nAttendants: please present ID badge."
  text = "1d4b7ffa";

  host.text.display("c237deff", title, text, choices, state.params, animate);
}

// Show interact button for "Take  you with me?"
export function stage_3c06e3e9(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: interactButton,
        slug: "passage/3c06e3e9",
      },
    ]);
  } else {
    host.controls.setButtons([]);
  }
}

// "Take  you with me?"
export function passage_3c06e3e9(): void {
  // "Fire"
  const title = "c141faa8";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  twine.incrementVisitCount("3c06e3e9");

  // "I can travel with you"
  text = "446cc2e5";

  host.text.display("3c06e3e9", title, text, choices, state.params, animate);
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

  if (level.overheat >= 0.1) {
    // Draw water
    choices.push("857ccfa7");
  }

  host.text.display("bdc7e965", title, text, choices, state.params, animate);
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

  // "I wish he'd leave. He's scaring off business."
  text = "acfb24bc";

  host.text.display("f213214a", title, text, choices, state.params, animate);
}

// Show interact button for "Where is the map?"
export function stage_a4c9f0e6(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: interactButton,
        slug: "passage/a4c9f0e6",
      },
    ]);
  } else {
    host.controls.setButtons([]);
  }
}

// "Where is the map?"
export function passage_a4c9f0e6(): void {
  // "Knight"
  const title = "f24b5246";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  twine.incrementVisitCount("a4c9f0e6");

  // "..zzz........"
  text = "3c2aef87";

  host.text.display("a4c9f0e6", title, text, choices, state.params, animate);
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

  // "For someone who goes by the name of $playerName."
  text = "8cd873af";
  // That's me.
  choices.push("c1cff3db");

  // I'll keep an eye out for them.
  choices.push("61a55b48");

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
  // I said 'Hi'
  choices.push("a37124ea");

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

  // "A fellow wanderer.... I'm here to seek and observe."
  text = "d4ffad4e";
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

  if (passageId === "e060e278") {
    found = true;
    passage_e060e278();
  }

  if (passageId === "12890122") {
    found = true;
    passage_12890122();
  }

  if (passageId === "1ce6844d") {
    found = true;
    passage_1ce6844d();
  }

  if (passageId === "909a9cff") {
    found = true;
    passage_909a9cff();
  }

  if (passageId === "562cd4ad") {
    found = true;
    passage_562cd4ad();
  }

  if (passageId === "857ccfa7") {
    found = true;
    passage_857ccfa7();
  }

  if (passageId === "c141faa8") {
    found = true;
    passage_Fire();
  }

  if (passageId === "99e18287") {
    found = true;
    passage_99e18287();
  }

  if (passageId === "ee255635") {
    found = true;
    passage_DeathSpiralDesert();
  }

  if (passageId === "7d52fd29") {
    found = true;
    passage_7d52fd29();
  }

  if (passageId === "d3e682fd") {
    found = true;
    passage_Amina();
  }

  if (passageId === "379dcdf1") {
    found = true;
    passage_379dcdf1();
  }

  if (passageId === "eb8d0d59") {
    found = true;
    passage_eb8d0d59();
  }

  if (passageId === "fe36d6fe") {
    found = true;
    passage_fe36d6fe();
  }

  if (passageId === "a2b8560b") {
    found = true;
    passage_a2b8560b();
  }

  if (passageId === "a37124ea") {
    found = true;
    passage_a37124ea();
  }

  if (passageId === "f510d9c0") {
    found = true;
    passage_f510d9c0();
  }

  if (passageId === "d62c3967") {
    found = true;
    passage_d62c3967();
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

  if (passageId === "491e88c5") {
    found = true;
    passage_Knight();
  }

  if (passageId === "c237deff") {
    found = true;
    passage_SkellysLair();
  }

  if (passageId === "3c06e3e9") {
    found = true;
    passage_3c06e3e9();
  }

  if (passageId === "bdc7e965") {
    found = true;
    passage_Well();
  }

  if (passageId === "f213214a") {
    found = true;
    passage_f213214a();
  }

  if (passageId === "a4c9f0e6") {
    found = true;
    passage_a4c9f0e6();
  }

  if (passageId === "885ce2f8") {
    found = true;
    passage_885ce2f8();
  }

  if (passageId === "3c0aa10d") {
    found = true;
    passage_3c0aa10d();
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
    log.info(`No passage found for ${passageId}, does it have content?`);
  }
}
