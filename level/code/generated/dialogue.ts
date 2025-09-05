import * as host from "@gl/api/w2h/host";
import { log } from "@gl/api/w2h/host";
import { String } from "@gl/types/i18n";
import * as twine from "@gl/utils/twine";
import * as level from "../main";

const interactButton = "interact";

class State {
  constructor() {}
  get params(): string[] {
    const params = new Array<string>();
    return params;
  }
}

export const state = new State();

// If we're using an alias on our link, then we need to map from our shown
// choice id to our alias choice id.
const choiceToPassage = new Map<string, string>();
choiceToPassage.set("5df30c94", "8f642673");

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

// Show interact button for "Don't you have water at your house?"
export function stage_DontYouHaveWaterAtYourHouse(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: interactButton,
        slug: "passage/234c2842",
      },
    ]);
  } else {
    host.controls.setButtons([]);
  }
}

// "Don't you have water at your house?"
export function passage_DontYouHaveWaterAtYourHouse(): void {
  // "Omar"
  const title = "2dd1283e";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  twine.incrementVisitCount("234c2842");

  // "No! Ever since the well was re-routed, the only water we have is the oasis. And it's nasty!"
  text = "bafa33c0";
  // What's wrong with that water?
  choices.push("4310725a");

  host.text.display("234c2842", title, text, choices, state.params, animate);
}

// Show interact button for "Guard Intro"
export function stage_GuardIntro(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: interactButton,
        slug: "passage/a41d9da6",
      },
    ]);
  } else {
    host.controls.setButtons([]);
  }
}

// "Guard Intro"
export function passage_GuardIntro(): void {
  // "Guard"
  const title = "c8d3fc56";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  twine.incrementVisitCount("a41d9da6");

  if (twine.hasVisited("a41d9da6")) {
    // "You don't listen well, do you?"
    text = "0a0de9e5";
  } else {
    // "This is the Sheikh's residence. Step away or I will remove you."
    text = "88fbd7e2";
  }

  host.text.display("a41d9da6", title, text, choices, state.params, animate);
}

// Show interact button for "How can I help?"
export function stage_HowCanIHelp(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: interactButton,
        slug: "passage/4d35ea21",
      },
    ]);
  } else {
    host.controls.setButtons([]);
  }
}

// "How can I help?"
export function passage_HowCanIHelp(): void {
  // "Nazar"
  const title = "e1ffb1d2";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  twine.incrementVisitCount("4d35ea21");

  // "Unless you're a lot stronger than you look and you can pry a grate off of the well with your hands, I don't think you can do much."
  text = "a2d6b1fc";

  host.text.display("4d35ea21", title, text, choices, state.params, animate);
}

// Show interact button for "Nazar Intro"
export function stage_NazarIntro(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: interactButton,
        slug: "passage/1d9b353c",
      },
    ]);
  } else {
    host.controls.setButtons([]);
  }
}

// "Nazar Intro"
export function passage_NazarIntro(): void {
  // "Nazar"
  const title = "e1ffb1d2";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  twine.incrementVisitCount("1d9b353c");

  // "Just what we need, another cup to fill."
  text = "458483c4";
  // Sorry? What does that mean?
  choices.push("60bd0f6d");

  host.text.display("1d9b353c", title, text, choices, state.params, animate);
}

// Show interact button for "Omar Intro"
export function stage_OmarIntro(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: interactButton,
        slug: "passage/b3420d25",
      },
    ]);
  } else {
    host.controls.setButtons([]);
  }
}

// "Omar Intro"
export function passage_OmarIntro(): void {
  // "Omar"
  const title = "2dd1283e";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  twine.incrementVisitCount("b3420d25");

  // "Hi there! I'm Omar and this is my dog Nabil. I can't really chat, I have to get him down to the water before he overheats."
  text = "76c5b00a";
  // Don't you have water at your house?
  choices.push("234c2842");

  host.text.display("b3420d25", title, text, choices, state.params, animate);
}

// Show interact button for "Sorry? What does that mean?"
export function stage_SorryWhatDoesThatMean(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: interactButton,
        slug: "passage/60bd0f6d",
      },
    ]);
  } else {
    host.controls.setButtons([]);
  }
}

// "Sorry? What does that mean?"
export function passage_SorryWhatDoesThatMean(): void {
  // "Nazar"
  const title = "e1ffb1d2";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  twine.incrementVisitCount("60bd0f6d");

  // "You're new here, yes? If you haven't noticed, we don't have water to spare."
  text = "3d9778f8";
  // Why not?
  choices.push("fae1cd1b");

  // How can I help?
  choices.push("4d35ea21");

  host.text.display("60bd0f6d", title, text, choices, state.params, animate);
}

// Show interact button for "Tarek Intro"
export function stage_TarekIntro(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: interactButton,
        slug: "passage/e38378a0",
      },
    ]);
  } else {
    host.controls.setButtons([]);
  }
}

// "Tarek Intro"
export function passage_TarekIntro(): void {
  // "Tarek"
  const title = "486ead0f";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  twine.incrementVisitCount("e38378a0");

  // "Welcome to Tarek's Table. I'm sorry but we are not seating anyone at this moment."
  text = "5b2b5977";
  // Why not?
  choices.push("5df30c94");

  host.text.display("e38378a0", title, text, choices, state.params, animate);
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
  const animate = true;
  let text = "";
  const choices: string[] = [];
  twine.incrementVisitCount("bdc7e965");

  // "This well is covered with a sturdy metal grate. A connected pipe is pumping the fresh water out."
  text = "f9f3dcdb";

  host.text.display("bdc7e965", title, text, choices, state.params, animate);
}

// Show interact button for "What's wrong with that water?"
export function stage_WhatsWrongWithThatWater(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: interactButton,
        slug: "passage/4310725a",
      },
    ]);
  } else {
    host.controls.setButtons([]);
  }
}

// "What's wrong with that water?"
export function passage_WhatsWrongWithThatWater(): void {
  // "Omar"
  const title = "2dd1283e";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  twine.incrementVisitCount("4310725a");

  // "This guy called the Sheikh dumps his old water into it. We have to boil it so its safe to drink."
  text = "72d68624";

  host.text.display("4310725a", title, text, choices, state.params, animate);
}

// Show interact button for "Why not?"
export function stage_WhyNot(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: interactButton,
        slug: "passage/fae1cd1b",
      },
    ]);
  } else {
    host.controls.setButtons([]);
  }
}

// "Why not?"
export function passage_WhyNot(): void {
  // "Nazar"
  const title = "e1ffb1d2";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  twine.incrementVisitCount("fae1cd1b");

  // "The Sheikh has decided that all of our fresh water now belongs to him. Does that clear it up for you?"
  text = "bb886cbf";

  host.text.display("fae1cd1b", title, text, choices, state.params, animate);
}

// Show interact button for "why-no-seat"
export function stage_whynoseat(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: interactButton,
        slug: "passage/8f642673",
      },
    ]);
  } else {
    host.controls.setButtons([]);
  }
}

// "why-no-seat"
export function passage_whynoseat(): void {
  // "Tarek"
  const title = "486ead0f";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  twine.incrementVisitCount("8f642673");

  // "The Sheikh cannot stand to wait when he wants his food. I must be ready to receive his order, so I'm sorry, but I cannot accomodate you right now."
  text = "13fb38a1";

  host.text.display("8f642673", title, text, choices, state.params, animate);
}

export function dispatch(passageId: string): void {
  let found = false;

  if (passageId === "234c2842") {
    found = true;
    passage_DontYouHaveWaterAtYourHouse();
  }

  if (passageId === "a41d9da6") {
    found = true;
    passage_GuardIntro();
  }

  if (passageId === "4d35ea21") {
    found = true;
    passage_HowCanIHelp();
  }

  if (passageId === "1d9b353c") {
    found = true;
    passage_NazarIntro();
  }

  if (passageId === "b3420d25") {
    found = true;
    passage_OmarIntro();
  }

  if (passageId === "60bd0f6d") {
    found = true;
    passage_SorryWhatDoesThatMean();
  }

  if (passageId === "e38378a0") {
    found = true;
    passage_TarekIntro();
  }

  if (passageId === "bdc7e965") {
    found = true;
    passage_Well();
  }

  if (passageId === "4310725a") {
    found = true;
    passage_WhatsWrongWithThatWater();
  }

  if (passageId === "fae1cd1b") {
    found = true;
    passage_WhyNot();
  }

  if (passageId === "8f642673") {
    found = true;
    passage_whynoseat();
  }

  if (!found) {
    log.info(`No passage found for ${passageId}, does it have content?`);
  }
}
