@unmanaged
class StackDescriptor {
  public stackStart: isize;
  public stackEnd: isize;
  constructor() {
    this.stackStart = heap.alloc(4096);
    this.stackEnd = this.stackStart + 4096;
  }
}

/**
 * Sets up our memory for asyncify. It allocates a stack descriptor (allocated
 * on the WASM heap), which is unmanaged by the garbage collector. This is
 * important so that it isn't GC'd or moved around.
 *
 * This stack descriptor contains two pointers, one to the start of where
 * asyncify is allowed to store its stack, and one to the end. Asyncify uses
 * this space to store the WASM stack when it is suspended, and restore it when
 * it is resumed.
 *
 * https://github.com/WebAssembly/binaryen/blob/main/src/passes/Asyncify.cpp
 *
 * @returns The pointer to the async stack descriptor.
 */
export function initAsyncStack(): usize {
  const stack = new StackDescriptor();
  const asyncStackPtr = changetype<usize>(stack);
  return asyncStackPtr;
}
