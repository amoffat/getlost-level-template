import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { actions } from "@/slices/mapEditor";
import { ColliderOpts } from "@/types/tools";
import { Fieldset, Kbd, Radio, Stack } from "@mantine/core";
import { useCallback } from "react";
import Tip from "../Tip";

export default function AddCollider() {
  const dispatch = useAppDispatch();
  const opts = useAppSelector(
    (state) => state.mapEditor.toolOptions["add-collider"]
  );

  const onChangeMode = useCallback(
    (value: string) => {
      const type = value as ColliderOpts["type"];
      dispatch(
        actions.setToolOptions({
          tool: "add-collider",
          options: { type },
        })
      );
    },
    [dispatch]
  );

  return (
    <>
      <Tip
        tips={[
          "Use the collider tool to create collision areas.",
          <>
            Hold <Kbd>Ctrl</Kbd> to snap the collider to the grid.
          </>,
          "Only use colliders for large areas. Small areas should use colliders set on the tile.",
        ]}
      />
      <Fieldset legend="Collider options" p="xs">
        <Radio.Group
          name="collider-mode"
          value={opts.type}
          onChange={onChangeMode}
        >
          <Stack>
            <Radio value="box" label="Box collider" />
            <Radio value="ellipse" label="Circle collider" />
          </Stack>
        </Radio.Group>
      </Fieldset>
    </>
  );
}
