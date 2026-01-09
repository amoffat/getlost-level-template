export interface Ellipse {
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
}

export function isEllipse(shape: any): shape is Ellipse {
  return "radiusX" in shape && "radiusY" in shape;
}
