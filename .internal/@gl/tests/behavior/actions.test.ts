import { CustomAction } from "@gl/actions/CustomAction";
import { PauseAction } from "@gl/actions/PauseAction";
import { TagAction } from "@gl/actions/TagAction";
import { Behavior } from "@gl/utils/behavior";
import { Character } from "@gl/utils/character";
import { test } from "../harness";
import { Probe, Recorder, run, tickerOf } from "./util";

/**
 * A minimal subject that exercises the *real* {@link Character} tag methods
 * (which only touch `tags`/`_tagCounts`) without constructing a Character and
 * its host dependencies. Lets us assert the reference-counting semantics.
 */
function tagSubject(): {
  tags: Set<string>;
  addTags(tags: string[]): void;
  removeTags(tags: string[]): void;
} {
  return {
    tags: new Set<string>(),
    _tagCounts: new Map<string, number>(),
    addTags: Character.prototype.addTags,
    removeTags: Character.prototype.removeTags,
  } as unknown as {
    tags: Set<string>;
    addTags(tags: string[]): void;
    removeTags(tags: string[]): void;
  };
}

/** Drives a behavior to completion, bypassing the globalTicker. */
function driveToDone(b: Behavior<unknown>, subject: unknown): void {
  b.onActionStart({ subject });
  const tick = tickerOf(b);
  let frames = 0;
  while (!b.isDone && frames < 1000) {
    frames++;
    tick(16);
  }
}

test("CustomAction fires start/tick/end across its duration", (t) => {
  const events: string[] = [];
  let ticks = 0;
  const subject = {} as unknown;
  const b = new Behavior<unknown>("root", subject);
  b.then(
    new CustomAction({
      name: "custom",
      durationMs: 100,
      onStart: () => events.push("start"),
      onTick: () => {
        ticks++;
      },
      onEnd: () => events.push("end"),
    }),
  );
  b.onActionStart({ subject });
  const tick = tickerOf(b);
  let frames = 0;
  while (!b.isDone && frames < 100) {
    frames++;
    tick(16);
  }
  t.eq(events, ["start", "end"], "start then end fired in order");
  t.ok(ticks > 0, "onTick fired at least once");
});

test("PauseAction just occupies its duration", (t) => {
  const rec = new Recorder();
  const b = run(rec, (b) => {
    b.then(new Probe("A", 50, rec))
      .then(new PauseAction({ duration: 100 }))
      .then(new Probe("B", 50, rec));
  });
  t.eq(b.getDuration(), 200, "duration includes the pause");
  t.ok(rec.starts["B"]! >= 150, "B waits out the 100ms pause after A");
});

test("TagAction adds tags on start and removes them after its duration", (t) => {
  const subject = tagSubject();
  const b = new Behavior<unknown>("root", subject);
  b.then(new TagAction({ tags: ["hurt"], durationMs: 100 }));

  b.onActionStart({ subject });
  const tick = tickerOf(b);
  tick(16); // first frame: onActionStart runs
  t.ok(subject.tags.has("hurt"), "tag present while the action is active");

  let frames = 0;
  while (!b.isDone && frames < 100) {
    frames++;
    tick(16);
  }
  t.notOk(subject.tags.has("hurt"), "tag removed once the action ends");
});

test("overlapping TagActions keep a shared tag until both end", (t) => {
  const subject = tagSubject();
  // Two actions add "hurt"; the short one ends first but the tag must persist
  // until the long one also ends (reference counting).
  const b = new Behavior<unknown>("root", subject);
  b.then(new TagAction({ tags: ["hurt"], durationMs: 200 })).also(
    new TagAction({ tags: ["hurt"], durationMs: 50 }),
  );

  b.onActionStart({ subject });
  const tick = tickerOf(b);
  // Advance past the short action's end (50ms) but before the long one's.
  tick(16);
  tick(16);
  tick(16);
  tick(16); // ~64ms elapsed
  t.ok(subject.tags.has("hurt"), "tag survives after the first action ends");

  let frames = 0;
  while (!b.isDone && frames < 100) {
    frames++;
    tick(16);
  }
  t.notOk(subject.tags.has("hurt"), "tag removed only after both actions end");
});

test("TagAction leaves a pre-existing (editor) tag untouched", (t) => {
  const subject = tagSubject();
  subject.tags.add("hurt"); // as if set in the editor — not reference-counted
  const b = new Behavior<unknown>("root", subject);
  b.then(new TagAction({ tags: ["hurt"], durationMs: 100 }));

  driveToDone(b, subject);
  t.ok(subject.tags.has("hurt"), "editor-set tag persists through add+remove");
});

test("a CustomAction can mutate its subject", (t) => {
  const subject = { hp: 100 };
  const b = new Behavior<{ hp: number }>("root", subject);
  b.then(
    new CustomAction<{ hp: number }>({
      name: "damage",
      durationMs: 0,
      onEnd: ({ subject }) => {
        subject.hp -= 25;
      },
    }),
  );
  b.onActionStart({ subject });
  const tick = (
    b as unknown as { _tickBehavior(d: number): void }
  )._tickBehavior.bind(b);
  let frames = 0;
  while (!b.isDone && frames < 10) {
    frames++;
    tick(16);
  }
  t.eq(subject.hp, 75, "hp reduced by the CustomAction");
});
