export interface Button {
  labelKey: string;
}

export interface ButtonWithCallbacks extends Button {
  onPress?: () => void;
  onRelease?: () => void;
}
