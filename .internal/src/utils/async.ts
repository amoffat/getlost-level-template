// Get the AsyncFunction constructor
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

export function isAsync(fn: any): boolean {
  return fn instanceof AsyncFunction;
}

// Until https://developer.mozilla.org/en-US/docs/Web/API/Scheduler/yield is
// more widely supported.
export async function schedulerYield(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
