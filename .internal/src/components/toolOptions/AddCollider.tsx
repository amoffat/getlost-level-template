import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { actions } from "@/slices/mapEditor";
import { ColliderOpts } from "@/types/tools";
import { Radio, Stack } from "@mantine/core";
import { useCallback } from "react";

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
    <Radio.Group name="collider-mode" value={opts.type} onChange={onChangeMode}>
      <Stack>
        <Radio value="box" label="Box collider" />
        <Radio value="ellipse" label="Circle collider" />
        <Radio value="polygon" label="Polygon collider" />
      </Stack>
    </Radio.Group>
  );
}
