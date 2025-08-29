// Get the AsyncFunction constructor
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

export function isAsync(fn: any): boolean {
  return fn instanceof AsyncFunction;
}
