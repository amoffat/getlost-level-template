export declare function addTiltShift(blur: f32): u32;
export declare function setTiltShiftBlur(id: u32, blur: i32): void;
export declare function setTiltShiftY(id: u32, y: f32): void;
export declare function addColorMatrix(): u32;
export declare function setColorMatrix(id: u32, matrix: f32[]): void;

export const _keep_addTiltShift = addTiltShift;
export const _keep_setTiltShiftBlur = setTiltShiftBlur;
export const _keep_setTiltShiftY = setTiltShiftY;
export const _keep_addColorMatrix = addColorMatrix;
export const _keep_setColorMatrix = setColorMatrix;
