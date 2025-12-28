import { globals as gPixi } from "@/editors/map/globals";
import { useAppSelector } from "@/hooks/redux";
import { selectors } from "@/slices/mapEditor";
import { Fieldset, Stack, Text } from "@mantine/core";
import { useEffect, useRef } from "react";

export default function PositionsFieldset() {
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
    <Fieldset legend="Positions">
      <Stack p={0}>
        {objPosX !== null && objPosY !== null && (
          <Text size="sm" variant="text">
            Object Pos: {objPosX}, {objPosY}
          </Text>
        )}
        <Text size="sm" variant="text">
          Cursor Pos: <span ref={cursorPosRef}></span>
        </Text>
      </Stack>
    </Fieldset>
  );
}
