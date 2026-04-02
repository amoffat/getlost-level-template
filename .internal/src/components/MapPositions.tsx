import { globals as gPixi } from "@/editors/map/globals";
import { useAppSelector } from "@/hooks/redux";
import { selectors } from "@/slices/mapEditor";
import { Paper, Text } from "@mantine/core";
import { useEffect, useRef } from "react";
import classes from "./styles/MapPositions.module.css";

export default function MapPositions() {
  const cursorPosRef = useRef<HTMLSpanElement>(null);
  const cursorPosRaf = useRef<number | null>(null);

  const selected = useAppSelector(selectors.selectedObjs);

  // Extract x/y separately to avoid re-renders when selected array reference changes
  // but the actual position values remain the same
  const selectedObj = selected.length === 1 ? selected[0] : null;
  const objPosX = selectedObj?.x ?? null;
  const objPosY = selectedObj?.y ?? null;

  // Update cursor position display without changing react state
  useEffect(() => {
    function updateCursorPos() {
      if (cursorPosRef.current) {
        const x = Math.floor(gPixi.mousePos.x);
        const y = Math.floor(gPixi.mousePos.y);
        cursorPosRef.current.textContent = `${x}, ${y}`;
      }
      cursorPosRaf.current = null;
    }

    function onMouseMove() {
      if (cursorPosRaf.current === null) {
        cursorPosRaf.current = requestAnimationFrame(updateCursorPos);
      }
    }

    window.addEventListener("mousemove", onMouseMove);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      if (cursorPosRaf.current !== null) {
        cancelAnimationFrame(cursorPosRaf.current);
      }
    };
  }, []);

  return (
    <Paper className={classes.root} p="xs" withBorder={false} radius={0}>
      {objPosX !== null && objPosY !== null && (
        <Text size="xs">
          Object Pos: {objPosX}, {objPosY}
        </Text>
      )}
      <Text size="xs">
        Cursor Pos: <span ref={cursorPosRef} />
      </Text>
    </Paper>
  );
}
