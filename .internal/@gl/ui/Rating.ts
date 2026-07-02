import * as ui from "@gl/api/ui";
import { Widget } from "./Widget";

/** A star-style rating (filled icons out of `max`) occupying one cell of the UI grid. */
export class Rating extends Widget {
  private _value: number;
  private _max: number;
  private _iconClass: string;
  private _color: string;

  constructor(opts: {
    col: number;
    row: number;
    /** Number of filled icons. Defaults to 0. */
    value?: number;
    max: number;
    /** An icon from https://phosphoricons.com/ */
    iconClass: string;
    color: string;
  }) {
    super(opts.col, opts.row);
    this._value = opts.value ?? 0;
    this._max = opts.max;
    this._iconClass = opts.iconClass;
    this._color = opts.color;
    this._sync();
  }

  protected _sync(): void {
    ui.setRating({
      col: this._col,
      row: this._row,
      value: this._value,
      max: this._max,
      iconClass: this._iconClass,
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

  get max(): number {
    return this._max;
  }
  set max(m: number) {
    this._max = m;
    this._sync();
  }

  set color(c: string) {
    this._color = c;
    this._sync();
  }
}
