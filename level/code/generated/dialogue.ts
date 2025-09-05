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

// Show interact button for "Excuse me? What do you mean?"
export function stage_ExcuseMeWhatDoYouMean(entered: bool): void {
  if (entered) {
    host.controls.setButtons([
      {
        label: interactButton,
        slug: "passage/c736163e",
      },
    ]);
  } else {
    host.controls.setButtons([]);
  }
}

// "Excuse me? What do you mean?"
export function passage_ExcuseMeWhatDoYouMean(): void {
  // "Nazar"
  const title = "e1ffb1d2";
  const animate = true;
  let text = "";
  const choices: string[] = [];
  twine.incrementVisitCount("c736163e");

  // "You're new here, yes? If you haven't noticed, we don't have water to spare."
  text = "3d9778f8";
  // Why not?
  choices.push("fae1cd1b");

  // How can I help?
  choices.push("4d35ea21");

  host.text.display("c736163e", title, text, choices, state.params, animate);
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
  // Excuse me? What do you mean?
  choices.push("c736163e");

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

  // "Hi there! I'm Omar and this is my dog Nabil."
  text = "c337178b";

  host.text.display("b3420d25", title, text, choices, state.params, animate);
}

export function dispatch(passageId: string): void {
  let found = false;

  if (passageId === "c736163e") {
    found = true;
    passage_ExcuseMeWhatDoYouMean();
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

  if (!found) {
    log.info(`No passage found for ${passageId}, does it have content?`);
  }
}
