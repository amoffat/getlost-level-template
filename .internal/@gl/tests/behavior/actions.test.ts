import { CustomAction } from "@gl/actions/CustomAction";
import { PauseAction } from "@gl/actions/PauseAction";
import { Behavior } from "@gl/utils/behavior";
import { test } from "../harness";
import { Probe, Recorder, run, tickerOf } from "./util";

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
