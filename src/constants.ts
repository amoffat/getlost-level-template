export const localDev = window.location.hostname === "localhost";
export const gameUrl = localDev
  ? "http://localhost:5174"
  : "https://game-qa.getlost.gg/"; // FIXME
