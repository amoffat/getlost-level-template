// If you're running the engine locally (only private beta testers can do this),
// set this to true. Otherwise, set it to false.
const localDev = true;

// This is where the Get Lost engine lives.
export const gameUrl = localDev
  ? "http://localhost:5174"
  : "https://game-qa.getlost.gg/";
