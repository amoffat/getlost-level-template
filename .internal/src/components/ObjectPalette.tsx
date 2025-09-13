import { LoadingOverlay, ScrollArea } from "@mantine/core";
import { JSX, useMemo } from "react";
import { useAppSelector } from "../hooks/redux";
import { TileGroup } from "../types/tilegroup";
import TilesetGroup from "./TilesetGroup";

interface ObjectPaletteProps {
  onSelectObject?: (obj: TileGroup) => void;
}

export default function ObjectPalette({ onSelectObject }: ObjectPaletteProps) {
  const ms = useAppSelector((state) => state.mapEditor);

  const objects: JSX.Element[] = useMemo(() => {
    const objs: JSX.Element[] = [];
    const num = ms.paletteIds.length;
    for (let i = num - 1; i >= 0; i--) {
      const objId = ms.paletteIds[i];
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
  }, [ms.paletteIds, ms.palette]);

  const selectObject = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName !== "DIV") return;
    const objId = target.dataset.objid;
    if (!objId) return;
    const obj = ms.palette[objId];
    onSelectObject?.(obj);
  };

  return (
    <ScrollArea p="xs" type="hover" offsetScrollbars="y" style={{ flex: 1 }}>
      <LoadingOverlay
        visible={ms.loadingPalette}
        zIndex={1000}
        overlayProps={{ blur: 2 }}
      />
      <div onClick={selectObject} style={{ paddingBottom: 50 }}>
        {objects}
      </div>
    </ScrollArea>
  );
}
