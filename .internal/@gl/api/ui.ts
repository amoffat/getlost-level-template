export declare function setProgressBar(opts: {
  col: number;
  row: number;
  label: string;
  value: number;
  color: string;
}): void;

// Not implemented yet
export declare function setNumeric(opts: {
  col: number;
  row: number;
  label: string;
  value: number;
}): void;

export declare function setTimer(opts: {
  name: string;
  col: number;
  row: number;
  label: string;
  initialTime: number;
  countDown: boolean;
  targetTime: number;
  showMilliseconds: boolean;
}): void;

export declare function setRating({
  col,
  row,
  value,
  max,
  iconClass,
  color,
}: {
  col: number;
  row: number;
  value: number;
  max: number;
  /** An icon from https://phosphoricons.com/  */
  iconClass: string;
  color: string;
}): void;

export declare function clearElement(col: number, row: number): void;
