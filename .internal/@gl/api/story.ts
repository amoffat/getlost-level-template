export declare function satisfy(stateId: string, value: boolean): void;
export declare function bulkSatisfy(state: Record<string, boolean>): void;
export declare function isSatisfied(stateId: string): boolean;
export declare function isAllSatisfied(stateId: string[]): boolean;
export declare function isAnySatisfied(stateId: string[]): boolean;
export declare function isReady(stateId: string): boolean;
export declare function isAllReady(stateId: string[]): boolean;
export declare function isAnyReady(stateId: string[]): boolean;
export declare function getState(): Record<string, boolean>;
