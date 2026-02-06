interface State {
  id: string;

  // The ids of any states that this state depends on in order to be satisfied.
  dependencies: Set<string>;

  // The ids of any states that depend on this state in order to be satisfied.
  dependents: Set<string>;

  // A state can be explicitly satisfied, meaning that it is satisfied
  // regardless of whether its dependencies are satisfied.
  explicitlySatisfied: boolean | null;

  // Map of NPC id to dialogue id
  npcDialogue: Record<string, string>;
}

/**
 * A state machine for tracking the state of milestones in the level and story,
 * for example, whether the player has talked to a certain NPC, or completed a
 * certain task. This is used to determine what dialogue options are available
 * for NPCs, and can also be used for other things like unlocking certain paths
 * in the level.
 */
class StateMachine {
  private _states: Record<string, State> = {};

  public get current(): Set<State> | null {
    const satisfiedStates: Set<State> = new Set();

    // Find all satisfied states
    for (const state of Object.values(this._states)) {
      if (this.isSatisfied(state.id)) {
        // Check if any of this state's dependents are also satisfied
        let hasNoSatisfiedDependents = true;
        for (const dependentId of state.dependents) {
          if (this.isSatisfied(dependentId)) {
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

    return satisfiedStates.size > 0 ? satisfiedStates : null;
  }

  /**
   * Satisfies or unsatisfies the given state. This will also recursively satisfy
   * or unsatisfy any dependencies/dependents of the given state, as appropriate.
   *
   * @param stateId The state to satisfy/unsatisfy
   * @param value Whether to satisfy/unsatisfy
   */
  public satisfy(stateId: string, value: boolean | null): void {
    const state = this._states[stateId];
    if (state) {
      state.explicitlySatisfied = value;
    }
  }

  public isSatisfied(stateId: string): boolean {
    const state = this._states[stateId];
    if (state) {
      if (state.explicitlySatisfied !== null) {
        return state.explicitlySatisfied;
      }

      for (const depId of state.dependencies) {
        if (!this.isSatisfied(depId)) {
          return false;
        }
      }
      return true;
    }
    return false;
  }

  /**
   * Based on the current satisfied dependencies, returns the dialogue ids for
   * the given NPC, if they exist. Multiple ids may be returned if there are
   * multiple states satisfied. In which case, you should pick one randomly.
   *
   * @param npcId The id of the NPC to retrieve dialogue for
   * @returns The dialogue ids, if they exists
   */
  public dialogueFor(npcId: string): Set<string> | null {
    const currentStates = this.current;
    if (!currentStates) return null;

    const dialogueIds: Set<string> = new Set();
    for (const state of currentStates) {
      const dialogueId = state.npcDialogue[npcId];
      if (dialogueId) {
        dialogueIds.add(dialogueId);
      }
    }

    if (dialogueIds.size > 0) {
      return dialogueIds;
    }
    return null;
  }
}
