import { Action } from "@gl/utils/behavior";

interface Subject {
  addTags(tags: string[]): void;
  removeTags(tags: string[]): void;
}

/**
 * Adds a set of tags to the subject when the action starts and removes them
 * when it ends (after `duration` ms). With `duration = 0` the tags are added
 * and immediately removed on the first frame.
 */
export class TagAction extends Action<Subject> {
  private readonly _tags: string[];

  constructor({
    name = "tag",
    tags,
    durationMs = 0,
  }: {
    name?: string;
    tags: string[];
    durationMs?: number;
  }) {
    super({ name, durationMs });
    this._tags = tags;
  }

  public override onActionStart({ subject }: { subject: Subject }): void {
    subject.addTags(this._tags);
  }

  public override onActionEnd({ subject }: { subject: Subject }): void {
    subject.removeTags(this._tags);
  }
}
