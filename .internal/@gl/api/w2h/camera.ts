import { Matrix } from "../../utils/la/mat";

export declare function setPosition(x: number, y: number): void;
export declare function zoom(scale: number): void;
export declare function localTransform(): Matrix;
export declare function worldTransform(): Matrix;
export declare function getFrame(): number[];
