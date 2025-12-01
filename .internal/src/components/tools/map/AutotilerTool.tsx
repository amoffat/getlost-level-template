import TilesetGroup from "@/components/TilesetGroup";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { actions as mapEdActions } from "@/slices/mapEditor";
import { store } from "@/store/store";
import { Fieldset, Group, Kbd, Stack, Text } from "@mantine/core";
import { useCallback, useEffect, useRef, useState } from "react";
import Tip from "../../Tip";
import classes from "./Autotiler.module.css";

export default function AutotilerTool() {
  const cands = useAppSelector(
    (state) => state.mapEditor.toolOptions["autotiler"].candidates
  );
  const dispatch = useAppDispatch();
  const [pressedKey, setPressedKey] = useState<number | null>(null);
  const pressTimerRef = useRef<number | null>(null);

  const onSelect = useCallback(
    (keyNumber: number) => {
      const cand = cands[keyNumber - 1];
      const state = store.getState();
      const pos = state.mapEditor.grid.curPos;
      if (!cand || !pos) return;

      dispatch(
        mapEdActions.setToolOptions({
          tool: "autotiler",
          options: { gridPosFreeze: pos },
        })
      );
      dispatch(mapEdActions.setPlace(cand));
    },
    [cands, dispatch]
  );

  // Forward numeric key presses to onSelect
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore if modifier keys are pressed or key repeats
      if (e.repeat || e.altKey || e.ctrlKey || e.metaKey) return;

      // Don't intercept when typing in inputs or editable fields
      const target = e.target as HTMLElement | null;
      const tag = (target?.tagName || "").toLowerCase();
      const isEditable =
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        target?.isContentEditable;
      if (isEditable) return;

      const n = parseInt(e.key, 10);

      if (n >= 1 && n <= cands.length) {
        // Briefly show the Kbd as pressed
        setPressedKey(n);
        if (pressTimerRef.current) window.clearTimeout(pressTimerRef.current);
        pressTimerRef.current = window.setTimeout(
          () => setPressedKey(null),
          150
        );

        onSelect?.(n);
        // Prevent accidental page scroll if any
        e.preventDefault();
      }
    };

    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      if (pressTimerRef.current) window.clearTimeout(pressTimerRef.current);
    };
  }, [cands.length, onSelect]);

  const showCands = cands.length > 0;

  return (
    <>
      <Tip
        tips={[
          "The autotiler lets you quickly place ground tiles that adapt to their surroundings.",
          "If you don't like the selected tile, press number keys to choose a different candidate.",
          "Moving the cursor slightly within a grid cell will result in candidates that allow more change in that direction.",
        ]}
      />
      {showCands && (
        <Fieldset legend="Autotiler candidates" p="xs">
          <Stack p={0} gap="sm" aria-label="Autotiler candidates">
            <Text size="xs" c="dimmed">
              Press number keys to choose a different tile
            </Text>
            {cands.map((cand, idx) => {
              const displayNumber = idx + 1; // 1-based label
              const pressHint = `Press ${displayNumber}`;
              const isPressed = pressedKey === displayNumber;
              return (
                <Group key={cand.id} align="center" gap="sm" wrap="nowrap">
                  <TilesetGroup group={cand} scale={3} />
                  <Kbd
                    className={`${classes.kbd} ${isPressed ? classes.kbdPressed : ""}`}
                    size="xl"
                    title={`${pressHint} to select`}
                    aria-label={`Key ${displayNumber}`}
                    aria-pressed={isPressed}
                  >
                    {displayNumber}
                  </Kbd>
                </Group>
              );
            })}
          </Stack>
        </Fieldset>
      )}
    </>
  );
}
