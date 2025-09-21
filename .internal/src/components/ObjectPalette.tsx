import { LoadingOverlay, ScrollArea } from "@mantine/core";
import { JSX, useCallback, useMemo } from "react";
import { useAppSelector } from "../hooks/redux";
import { TileGroup } from "../types/tilegroup";
import { Tileset } from "../types/tileset";
import TilesetGroup from "./TilesetGroup";

interface ObjectPaletteProps {
  tileset?: Tileset | null;
  selected?: TileGroup | null;
  onSelectObject?: (obj: TileGroup) => void;
  onDeselectObject?: () => void;
}

export default function ObjectPalette({
  selected = null,
  onSelectObject,
  onDeselectObject,
  tileset: showTileset,
}: ObjectPaletteProps) {
  const tsState = useAppSelector((state) => state.tilesetEditor);

  const objects: JSX.Element[] = useMemo(() => {
    const objs: JSX.Element[] = [];

    const tilesets: Tileset[] = Object.values(tsState.tilesets).filter((t) => {
      if (showTileset) {
        return t.id === showTileset.id;
      } else if (showTileset === null) {
        return false;
      } else {
        return true;
      }
    });

    for (const ts of tilesets) {
      const num = ts.paletteIds.length;
      for (let i = num - 1; i >= 0; i--) {
        const objId = ts.paletteIds[i];
        const group = ts.palette[objId];
        const key = `${ts.id}-${group.id}`;
        objs.push(
          <TilesetGroup
            scale={1}
            key={key}
            group={group}
            selected={selected?.id === group.id}
          />
        );
      }
    }

    return objs;
  }, [tsState.tilesets, showTileset, selected]);

  const selectObject = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName !== "DIV") return;
      const objId = target.dataset.objid;
      const tsId = target.dataset.tsid;

      if (!objId || !tsId) {
        onDeselectObject?.();
        return;
      }

      const obj = tsState.tilesets[tsId].palette[objId];
      if (obj === selected) {
        onDeselectObject?.();
      } else {
        onSelectObject?.(obj);
      }
    },
    [selected, onSelectObject, onDeselectObject, tsState.tilesets]
  );

  return (
    <ScrollArea.Autosize
      p="xs"
      type="auto"
      offsetScrollbars
      h="100%"
      style={{ flex: 1, minHeight: 0 }}
    >
      <LoadingOverlay
        visible={tsState.loadingPalette}
        zIndex={1000}
        overlayProps={{ blur: 2 }}
      />
      <div onClick={selectObject} style={{ paddingBottom: 50 }}>
        {objects}
      </div>
    </ScrollArea.Autosize>
  );
}
