import * as ui from "@gl/api/ui";
import { Widget } from "./Widget";

/**
 * A count-up or count-down timer occupying one cell of the UI grid.
 *
 * Once created the timer runs on the host; there is no per-frame `value` to
 * push, so use {@link reset} to restart it (optionally from a new time).
 */
export class Timer extends Widget {
  private _name: string;
  private _label: string;
  private _initialTime: number;
  private _countDown: boolean;
  private _targetTime: number;
  private _showMilliseconds: boolean;

  constructor(opts: {
    name: string;
    col: number;
    row: number;
    label: string;
    /** Starting time in milliseconds. Defaults to 0. */
    initialTime?: number;
    /** Count down toward `targetTime` instead of up. Defaults to false. */
    countDown?: boolean;
    /** Target time in milliseconds. Defaults to 0. */
    targetTime?: number;
    /** Defaults to false. */
    showMilliseconds?: boolean;
  }) {
    super(opts.col, opts.row);
    this._name = opts.name;
    this._label = opts.label;
    this._initialTime = opts.initialTime ?? 0;
    this._countDown = opts.countDown ?? false;
    this._targetTime = opts.targetTime ?? 0;
    this._showMilliseconds = opts.showMilliseconds ?? false;
    this._sync();
  }

  protected _sync(): void {
    ui.setTimer({
      name: this._name,
      col: this._col,
      row: this._row,
      label: this._label,
      initialTime: this._initialTime,
      countDown: this._countDown,
      targetTime: this._targetTime,
      showMilliseconds: this._showMilliseconds,
    });
  }

  /** Restart the timer, optionally from a new initial time (in milliseconds). */
  reset(initialTime?: number): void {
    if (initialTime !== undefined) {
      this._initialTime = initialTime;
    }
    this._sync();
  }

  set label(l: string) {
    this._label = l;
    this._sync();
  }
}
