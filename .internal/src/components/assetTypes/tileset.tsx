import { unpackActiveTileset } from "@/editor/tileset/loader";
import { useAppDispatch } from "@/hooks/redux";
import { actions } from "@/slices/tilesetEditor";
import { selectTilesetThunk } from "@/thunks/tileset";
import { Tileset } from "@/types/tileset";
import { genTilesetId } from "@/utils/tileset";
import { FileWithPath } from "@mantine/dropzone";
import { useCallback } from "react";

export default function TilesetSteps() {
  const dispatch = useAppDispatch();

  const uploadTileset = useCallback(
    async (files: FileWithPath[]) => {
      if (!files.length) return;
      for (const file of files) {
        const objectUrl = URL.createObjectURL(file);
        const tsId = await genTilesetId(file);
        const ts: Tileset = {
          id: tsId,
          objectUrl,
          palette: {},
          paletteIds: [],
          saved: false,
        };
        dispatch(actions.addTileset({ tsId, ts }));
        await dispatch(selectTilesetThunk(ts));
        await unpackActiveTileset();
      }
    },
    [dispatch]
  );

  return <div>Tileset Steps Component</div>;
}
