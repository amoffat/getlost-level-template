import * as ui from "@gl/api/ui";
import { Widget } from "./Widget";

/** A labeled progress bar occupying one cell of the UI grid. */
export class ProgressBar extends Widget {
  private _label: string;
  private _value: number;
  private _color: string;

  constructor(opts: {
    col: number;
    row: number;
    label: string;
    /** 0..1 fill amount. Defaults to 0. */
    value?: number;
    color: string;
  }) {
    super(opts.col, opts.row);
    this._label = opts.label;
    this._value = opts.value ?? 0;
    this._color = opts.color;
    this._sync();
  }

  protected _sync(): void {
    ui.setProgressBar({
      col: this._col,
      row: this._row,
      label: this._label,
      value: this._value,
      color: this._color,
    });
  }

  get value(): number {
    return this._value;
  }
  set value(v: number) {
    this._value = v;
    this._sync();
  }

  set label(l: string) {
    this._label = l;
    this._sync();
  }

  set color(c: string) {
    this._color = c;
    this._sync();
  }
}
