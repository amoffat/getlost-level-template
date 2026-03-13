import { createContext, useContext } from "react";

interface AncestorHighlight {
  /** IDs of ancestor nodes to highlight */
  nodeIds: Set<string>;
  /** IDs of ancestor edges to highlight */
  edgeIds: Set<string>;
}

const defaultValue: AncestorHighlight = {
  nodeIds: new Set(),
  edgeIds: new Set(),
};

export const AncestorHighlightContext =
  createContext<AncestorHighlight>(defaultValue);

export function useAncestorHighlight() {
  return useContext(AncestorHighlightContext);
}
