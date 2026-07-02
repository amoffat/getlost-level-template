import * as ui from "@gl/api/ui";

/**
 * Base class for HUD widgets that occupy a single cell of the UI grid.
 *
 * Subclasses hold their own display state and implement {@link _sync} to push
 * that state to the host, (re)creating the widget in its cell. Every widget is
 * removed the same way, so {@link destroy} is shared here.
 *
 * Note: the constructor intentionally does *not* call `_sync()` — subclasses
 * must call it at the end of their own constructor, once their fields are
 * initialized. Calling it from here would run before those fields exist.
 */
export abstract class Widget {
  protected _col: number;
  protected _row: number;

  constructor(col: number, row: number) {
    this._col = col;
    this._row = row;
  }

  /** Push current state to the host, (re)creating the widget in its cell. */
  protected abstract _sync(): void;

  /** Remove the widget from its cell. */
  destroy(): void {
    ui.clearElement(this._col, this._row);
  }
}
