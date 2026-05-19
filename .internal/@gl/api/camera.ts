import { Matrix } from "@gl/utils/mat";

export declare function setPosition(x: number, y: number): void;
export declare function getZoom(): number;
export declare function setZoom(scale: number): void;
export declare function localTransform(): Matrix;
export declare function worldTransform(): Matrix;
export declare function getFrame(): number[];
