import { useAncestorHighlight } from "@/contexts/AncestorHighlightContext";
import { useAppDispatch } from "@/hooks/redux";
import { setEdges, StoryNode, type StoryEdge } from "@/slices/story";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useReactFlow,
  type EdgeProps,
} from "@xyflow/react";
import classNames from "classnames";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./styles/StoryEdge.module.css";

/**
 * Custom edge for the story graph.
 * Renders a bezier path with a small circular NOT toggle at the midpoint.
 * Clicking the toggle flips the `negated` flag on the edge data, which
 * inverts the truthiness of the connection.
 */
export default function StoryEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  data,
  selected,
  interactionWidth,
}: EdgeProps<StoryEdge>) {
  const dispatch = useAppDispatch();
  const { edgeIds: ancestorEdgeIds } = useAncestorHighlight();
  const { getEdges, setEdges: setFlowEdges } = useReactFlow<
    StoryNode,
    StoryEdge
  >();

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const negated = data?.negated ?? false;
  const isAncestor = ancestorEdgeIds.has(id);
  const [hovered, setHovered] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToggle = negated || hovered || selected;

  const startHide = useCallback(() => {
    hideTimer.current = setTimeout(() => setHovered(false), 100);
  }, []);

  const cancelHide = useCallback(() => {
    if (hideTimer.current !== null) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    setHovered(true);
  }, []);

  useEffect(() => {
    return () => {
      if (hideTimer.current !== null) clearTimeout(hideTimer.current);
    };
  }, []);

  const toggleNegated = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      const updatedEdges = getEdges().map((e) =>
        e.id === id ? { ...e, data: { ...e.data, negated: !negated } } : e,
      );
      setFlowEdges(updatedEdges);
      dispatch(setEdges(updatedEdges));
    },
    [id, negated, getEdges, setFlowEdges, dispatch],
  );

  return (
    <>
      <g onMouseEnter={cancelHide} onMouseLeave={startHide}>
        <BaseEdge
          path={edgePath}
          markerEnd={markerEnd}
          style={style}
          interactionWidth={interactionWidth}
          className={
            classNames({
              [styles.negatedEdge]: negated,
              [styles.ancestorEdge]: isAncestor,
            }) || undefined
          }
        />
      </g>
      {showToggle && (
        <EdgeLabelRenderer>
          <div
            className={`${styles.notToggle} ${negated ? styles.active : styles.inactive} nopan`}
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
            onMouseEnter={cancelHide}
            onMouseLeave={startHide}
            onClick={toggleNegated}
            title={negated ? "Negated - click to reset" : "Click to negate"}
          >
            {negated ? "NOT" : ""}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
