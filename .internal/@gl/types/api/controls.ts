export interface Button {
  labelKey: string;
  // Optional physical KeyboardEvent.code (e.g. "KeyK") that also triggers this
  // button on desktop. Layout-independent, like WASD. Avoid the reserved
  // movement/action keys (WASD, arrows, and J/K/L/I).
  key?: string;
}

export interface ButtonWithCallbacks extends Button {
  onPress?: () => void;
  onRelease?: () => void;
}
