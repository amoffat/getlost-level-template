export class Tuple2<T, U> {
  first: T;
  second: U;

  constructor(min: T, max: U) {
    this.first = min;
    this.second = max;
  }
}
