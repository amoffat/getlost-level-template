import { choose } from "./rand";

export interface StateEdge {
  stateId: string;
  negated: boolean;
}

export interface StoryState {
  id: string;
  kind: "story" | "or";
  // The edges representing states that this state depends on in order to be
  // satisfied. If an edge is negated, the dependency must NOT be satisfied for
  // this state to be satisfied.
  dependencies: StateEdge[];
  // The edges representing states that depend on this state in order to be satisfied.
  dependents: StateEdge[];
}

export interface MilestoneState extends StoryState {
  kind: "story";

  // A state can be explicitly satisfied, meaning that it is satisfied
  // regardless of whether its dependencies are satisfied.
  explicitlySatisfied: boolean | null;

  // Map of NPC id to dialogue id
  npcDialogue: Record<string, string>;
}

export interface OrState extends StoryState {
  kind: "or";
}

/** Union of all state node types in the story graph. */
export type State = MilestoneState | OrState;

/** Type guard: returns true if the state is a MilestoneState (AND logic). */
export function isMilestoneState(state: State): state is MilestoneState {
  return state.kind === "story";
}

/** Type guard: returns true if the state is an OrState (OR logic). */
export function isOrState(state: State): state is OrState {
  return state.kind === "or";
}

/**
 * A state machine for tracking the state of milestones in the level and story,
 * for example, whether the player has talked to a certain NPC, or completed a
 * certain task. This is used to determine what dialogue options are available
 * for NPCs, and can also be used for other things like unlocking certain paths
 * in the level.
 */
export class StoryStateMachine {
  private _states: Record<string, State> = {};

  constructor(states: State[]) {
    for (const state of states) {
      this._states[state.id] = state;
    }
  }

  public get available(): Set<State> {
    const states: Set<State> = new Set();
    return states;
  }

  public get current(): Set<State> {
    const satisfiedStates: Set<State> = new Set();

    // Find all satisfied states
    for (const state of Object.values(this._states)) {
      if (this.isSatisfied(state.id)) {
        // Check if any of this state's dependents are also satisfied
        let hasNoSatisfiedDependents = true;
        for (const dep of state.dependents) {
          if (this.isSatisfied(dep.stateId)) {
            hasNoSatisfiedDependents = false;
            break;
          }
        }

        // Only include if no dependents are satisfied
        if (hasNoSatisfiedDependents) {
          satisfiedStates.add(state);
        }
      }
    }

    return satisfiedStates;
  }

  /**
   * Satisfies or unsatisfies the given state. Only applies to MilestoneState
   * nodes; OrState nodes derive satisfaction purely from their dependencies.
   *
   * @param stateId The state to satisfy/unsatisfy
   * @param value Whether to satisfy/unsatisfy
   */
  public satisfy(stateId: string, value: boolean | null): void {
    const state = this._states[stateId];
    if (state && isMilestoneState(state)) {
      state.explicitlySatisfied = value;
    }
  }

  public isSatisfied(stateId: string): boolean {
    const state = this._states[stateId];
    if (!state) return false;

    // MilestoneState nodes can be explicitly satisfied
    if (isMilestoneState(state) && state.explicitlySatisfied !== null) {
      return state.explicitlySatisfied;
    }

    if (isOrState(state)) {
      // OR logic: at least one dependency must be satisfied (respecting negation)
      if (state.dependencies.length === 0) return true;
      for (const dep of state.dependencies) {
        const depSatisfied = this.isSatisfied(dep.stateId);
        if (dep.negated ? !depSatisfied : depSatisfied) {
          return true;
        }
      }
      return false;
    }

    // AND logic (default for StoryState): all dependencies must be satisfied
    for (const dep of state.dependencies) {
      const depSatisfied = this.isSatisfied(dep.stateId);
      if (dep.negated ? depSatisfied : !depSatisfied) {
        return false;
      }
    }
    return true;
  }

  /**
   * Based on the current satisfied dependencies, returns the dialogue ids for
   * the given NPC, if they exist. Multiple ids may be be found, in which case
   * one is chosen at random.
   *
   * @param npcId The id of the NPC to retrieve dialogue for
   * @returns A dialogue id, or null if no dialogue is available for the given
   * NPC
   */
  public dialogueFor(npcId: string): string | null {
    const currentStates = this.current;
    if (!currentStates) return null;

    const dialogueIds: Set<string> = new Set();
    for (const state of currentStates) {
      if (isMilestoneState(state)) {
        const dialogueId = state.npcDialogue[npcId];
        if (dialogueId) {
          dialogueIds.add(dialogueId);
        }
      }
    }

    if (dialogueIds.size > 0) {
      return choose(Array.from(dialogueIds));
    }
    return null;
  }
}
