import { Behavior } from "@gl/utils/behavior";
import { test } from "../harness";
import { Probe, Recorder, run, tickerOf } from "./util";

test("then -> then sequences actions and sums their duration", (t) => {
  const rec = new Recorder();
  const b = run(rec, (b) => {
    b.then(new Probe("A", 100, rec)).then(new Probe("B", 100, rec));
  });
  t.ok(rec.starts["B"]! >= rec.ends["A"]!, "B starts at/after A ends");
  t.eq(b.getDuration(), 200, "total duration is 200");
});

test("thenOffset with a positive offset delays and shifts downstream", (t) => {
  const rec = new Recorder();
  const b = run(rec, (b) => {
    b.then(new Probe("A", 100, rec))
      .thenOffset(50, new Probe("B", 100, rec))
      .then(new Probe("C", 100, rec));
  });
  t.ok(rec.starts["B"]! >= 150, "B starts >= 150 (100 + 50 gap)");
  t.ok(rec.starts["C"]! >= rec.ends["B"]!, "C follows the shifted B");
  t.eq(b.getDuration(), 350, "duration grows by the 50ms gap");
});

test("thenOffset with a negative offset overlaps the previous action", (t) => {
  const rec = new Recorder();
  const b = run(rec, (b) => {
    b.then(new Probe("A", 100, rec)).thenOffset(-40, new Probe("B", 100, rec));
  });
  t.ok(rec.starts["B"]! < rec.ends["A"]!, "B starts before A ends (overlap)");
  t.eq(b.getDuration(), 160, "duration shrinks by the 40ms overlap");
});

test("thenOffset clamps a large negative offset to time 0", (t) => {
  const rec = new Recorder();
  run(rec, (b) => {
    b.thenOffset(-9999, new Probe("A", 100, rec));
  });
  t.ok(rec.starts["A"]! <= 16, "A starts within the first frame");
});

test("alsoOffset shifts the side action but not the sequential cursor", (t) => {
  const rec = new Recorder();
  run(rec, (b) => {
    b.then(new Probe("A", 100, rec))
      .alsoOffset(30, new Probe("S", 40, rec))
      .then(new Probe("B", 100, rec));
  });
  t.ok(rec.starts["S"]! >= 30, "S is delayed ~30ms into A's slot");
  t.ok(
    rec.starts["B"]! >= 100 && rec.starts["B"]! < 116,
    "B still starts ~100",
  );
});

test("alsoOffset with a negative offset starts the side before its main", (t) => {
  const rec = new Recorder();
  run(rec, (b) => {
    b.then(new Probe("A", 100, rec))
      .then(new Probe("B", 100, rec))
      .alsoOffset(-30, new Probe("S", 40, rec));
  });
  t.ok(rec.starts["S"]! <= rec.starts["B"]!, "S starts at/before B");
});

test("a side action outliving its main does not delay the next slot", (t) => {
  const rec = new Recorder();
  const b = run(rec, (b) => {
    b.then(new Probe("A", 100, rec))
      .also(new Probe("S", 300, rec))
      .then(new Probe("B", 100, rec));
  });
  t.ok(rec.starts["B"]! < 116, "B starts ~100, not delayed by the long side");
  t.eq(b.getDuration(), 300, "duration is bounded by the long side");
});

test("cancel stops the behavior without ending in-flight actions", (t) => {
  const rec = new Recorder();
  const subject = {} as unknown;
  const b = new Behavior<unknown>("root", subject);
  let ended = false;
  b.then(new Probe("A", 1000, rec));
  b.onBehaviorEnd(() => {
    ended = true;
  });
  b.onActionStart({ subject });
  const tick = tickerOf(b);
  tick(16); // A is now running
  b.cancel();
  tick(16); // completion detected here
  t.ok(ended, "behavior-end fired after cancel");
  t.ok(rec.ends["A"] === undefined, "no onActionEnd for the cancelled action");
  t.ok(b.isDone, "behavior reports done after cancel");
});

test("a behavior can only be started once", (t) => {
  const rec = new Recorder();
  const subject = {} as unknown;
  const b = new Behavior<unknown>("root", subject);
  b.then(new Probe("A", 10, rec));
  b.onActionStart({ subject });
  t.throws(() => b.onActionStart({ subject }), "throws on reuse");
});
