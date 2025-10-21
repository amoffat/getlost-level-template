import * as P from "pixi.js";

export const invisibleStroke: P.StrokeStyle = {
  color: 0x000000,
  width: 1,
  alpha: 0,
};

export const groupStroke: P.StrokeStyle = {
  color: 0x00ff00,
  width: 2,
  alpha: 0.75,
};

export const selectStroke: P.StrokeStyle = {
  color: 0x00ff00,
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
