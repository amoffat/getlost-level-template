import { LoadingOverlay, ScrollArea } from "@mantine/core";
import { JSX, useMemo } from "react";
import { useAppSelector } from "../hooks/redux";
import { TileGroup } from "../types/tilegroup";
import { Tileset } from "../types/tileset";
import TilesetGroup from "./TilesetGroup";

interface ObjectPaletteProps {
  tileset?: Tileset | null;
  onSelectObject?: (obj: TileGroup) => void;
}

export default function ObjectPalette({
  onSelectObject,
  tileset,
}: ObjectPaletteProps) {
  const ms = useAppSelector((state) => state.mapEditor);

  const objects: JSX.Element[] = useMemo(() => {
    const objs: JSX.Element[] = [];

    const filteredIds = ms.paletteIds.filter((id) => {
      const obj = ms.palette[id];
      return !tileset || obj.tilesetId === tileset?.id;
    });

    const num = filteredIds.length;
    for (let i = num - 1; i >= 0; i--) {
      const objId = filteredIds[i];
      const group = ms.palette[objId];
      objs.push(
        <TilesetGroup
          scale={1}
          key={i}
          id={group.id}
          src={group.objectUrl}
          coords={group.pos}
        />
      );
    }

    return objs;
  }, [ms.paletteIds, ms.palette, tileset]);

  const selectObject = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName !== "DIV") return;
    const objId = target.dataset.objid;
    if (!objId) return;
    const obj = ms.palette[objId];
    onSelectObject?.(obj);
  };

  return (
    <ScrollArea.Autosize
      p="xs"
      type="auto"
      offsetScrollbars
      h="100%"
      style={{ flex: 1, minHeight: 0 }}
    >
      <LoadingOverlay
        visible={ms.loadingPalette}
        zIndex={1000}
        overlayProps={{ blur: 2 }}
      />
      <div onClick={selectObject} style={{ paddingBottom: 50 }}>
        {objects}
      </div>
    </ScrollArea.Autosize>
  );
}
