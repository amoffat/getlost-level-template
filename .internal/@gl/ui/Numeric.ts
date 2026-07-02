import * as ui from "@gl/api/ui";
import { Widget } from "./Widget";

/** A labeled numeric readout occupying one cell of the UI grid. */
export class Numeric extends Widget {
  private _label: string;
  private _value: number;

  constructor(opts: {
    col: number;
    row: number;
    label: string;
    /** Defaults to 0. */
    value?: number;
  }) {
    super(opts.col, opts.row);
    this._label = opts.label;
    this._value = opts.value ?? 0;
    this._sync();
  }

  protected _sync(): void {
    ui.setNumeric({
      col: this._col,
      row: this._row,
      label: this._label,
      value: this._value,
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
}
