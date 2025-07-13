export declare function setProgressBar(
  col: u32,
  row: u32,
  label: string,
  value: f32,
  color: string
): void;

// Not implemented yet
export declare function setNumeric(
  col: u32,
  row: u32,
  label: string,
  value: i32
): void;

// Not implemented yet
export declare function setTimer(
  name: string,
  col: u32,
  row: u32,
  label: string,
  initialTime: f32,
  countDown: boolean,
  targetTime: f32,
  showMilliseconds: boolean
): void;

export declare function setRating(
  col: u32,
  row: u32,
  value: f32,
  max: f32,
  iconClass: string,
  color: string
): void;

export declare function clearElement(col: u32, row: u32): void;

export const _keep_setProgressBar = setProgressBar;
export const _keep_setNumeric = setNumeric;
export const _keep_setTimer = setTimer;
export const _keep_setRating = setRating;
export const _keep_clearElement = clearElement;
