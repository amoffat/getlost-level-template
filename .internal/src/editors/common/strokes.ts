import * as P from "pixi.js";

export const invisibleStroke: P.StrokeStyle = {
  color: 0x000000,
  width: 1,
  alpha: 0,
};

export const groupStroke: P.StrokeStyle = {
  color: 0xff0000,
  width: 2,
  alpha: 0.75,
};

export const selectStroke: P.StrokeStyle = {
  color: 0x00ff00,
  width: 5,
  alpha: 0.75,
};

export const fillStroke: P.StrokeStyle = {
  color: 0x0000ff,
  width: 5,
  alpha: 0.75,
};

export const colliderStroke: P.StrokeStyle = {
  color: 0xffffff,
  width: 2,
  alpha: 0.75,
};

export const colliderFill: P.FillStyle = {
  color: 0x000000,
  alpha: 0.5,
};

export const tileSelectFill: P.FillStyle = {
  color: 0x00ff00,
  alpha: 0.25,
};

export const gridStroke: P.StrokeInput = {
  color: 0x000000,
  width: 1,
  alpha: 0.4,
  pixelLine: true,
};

export const overlayFill: P.FillStyle = {
  color: 0x000000,
  alpha: gridStroke.alpha,
};

export const exitFill: P.FillStyle = {
  color: 0x000000,
  alpha: 0.35,
};
