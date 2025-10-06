export function suspensify<T>(p: Promise<T>) {
  let status: "pending" | "success" | "error" = "pending";
  let value: T;
  let error: any;

  const suspender = p.then(
    (v) => {
      status = "success";
      value = v;
    },
    (e) => {
      status = "error";
      error = e;
    }
  );

  return {
    read() {
      if (status === "pending") throw suspender; // <-- causes Suspense
      if (status === "error") throw error; // <-- let ErrorBoundary handle it
      return value!;
    },
  };
}
