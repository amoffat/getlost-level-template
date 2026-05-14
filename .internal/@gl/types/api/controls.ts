export interface Button {
  labelKey: string;
  slug: string;
}

export interface ButtonWithCallbacks extends Button {
  onPress?: () => void;
  onRelease?: () => void;
}
