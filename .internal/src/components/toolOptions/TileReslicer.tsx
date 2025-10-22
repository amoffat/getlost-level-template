import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { actions } from "@/slices/tilesetEditor";
import { retileThunk } from "@/thunks/tileset";
import { Button, Fieldset, Stack } from "@mantine/core";
import { useCallback } from "react";
import GridSizeInput from "../GridSizeInput";
import Tip from "../Tip";

export default function TileReslicer() {
  const dispatch = useAppDispatch();
  const grid = useAppSelector((state) => state.tilesetEditor.grid);
  const activeTilesetId = useAppSelector(
    (state) => state.tilesetEditor.activeTilesetId
  );

  const changeGridSize = useCallback(
    async (size: number | string) => {
      if (typeof size === "string") return;
      dispatch(actions.setGridSize(size));
    },
    [dispatch]
  );

  const resliceTiles = useCallback(() => {
    if (!activeTilesetId) return;
    dispatch(retileThunk(activeTilesetId));
  }, [dispatch, activeTilesetId]);

  return (
    <>
      <Tip
        tips={[
          "Reslice will create new tiles based on the current grid size.",
          "Only unique tiles will be created, and empty tiles will be skipped.",
          "Adjust the grid size to see a preview of how the tiles will be sliced.",
        ]}
      />
      <Fieldset legend="Reslicer" p="xs">
        <Stack p={0}>
          <GridSizeInput defaultValue={grid.size} onChange={changeGridSize} />

          <Button variant="filled" fullWidth onClick={resliceTiles}>
            Slice
          </Button>
        </Stack>
      </Fieldset>
    </>
  );
}
