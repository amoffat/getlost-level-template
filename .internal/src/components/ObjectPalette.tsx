import { Vector } from "@/vec";
import { LoadingOverlay, Portal, ScrollArea, TextInput } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import React, { JSX, useCallback, useEffect, useMemo, useState } from "react";
import { useAppSelector } from "../hooks/redux";
import { TileGroup } from "../types/tilegroup";
import { Tileset } from "../types/tileset";
import TileGroupMenu from "./TileGroupMenu";
import TilesetGroup from "./TilesetGroup";

interface ObjectPaletteProps {
  tileset?: Tileset | null;
  allowSelect?: boolean;
  onSelectObject?: (obj: TileGroup, e: React.MouseEvent) => void;
  onDeselectObject?: () => void;
}

export default function ObjectPalette({
  onSelectObject,
  onDeselectObject,
  tileset: showTileset,
  allowSelect = true,
}: ObjectPaletteProps) {
  const [objMenuPos, setObjMenuPos] = useState<Vector | null>(null);
  const [clickedPaletteObject, setClickedPaletteObject] =
    useState<TileGroup | null>(null);
  const tsState = useAppSelector((state) => state.tilesetEditor);
  const [selectedObject, setSelectedObject] = useState<TileGroup | null>(null);

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
            selected={selectedObject?.id === group.id && allowSelect}
          />
        );
      }
    }

    return objs;
  }, [tsState.tilesets, showTileset, selectedObject, allowSelect]);

  const deselectObject = useCallback(() => {
    setObjMenuPos(null);
    onDeselectObject?.();
    setSelectedObject(null);
  }, [onDeselectObject]);

  useEffect(() => {
    const escapeHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        deselectObject();
      }
    };
    window.addEventListener("keydown", escapeHandler);
    window.addEventListener("onpointerdown", deselectObject);
    return () => {
      window.removeEventListener("keydown", escapeHandler);
      window.removeEventListener("onpointerdown", deselectObject);
    };
  }, [deselectObject]);

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  const onPointerDown = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName !== "DIV") return;

      e.stopPropagation();
      const objId = target.dataset.objid;
      const tsId = target.dataset.tsid;

      if (!objId || !tsId) {
        deselectObject();
        return;
      }

      const obj = tsState.tilesets[tsId].palette[objId];
      if (e.button === 0) {
        if (objId === selectedObject?.id) {
          deselectObject();
        } else {
          setSelectedObject(obj);
          onSelectObject?.(obj, e);
        }
      } else if (e.button === 2) {
        const el = e.target as HTMLElement;
        const rect = el.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 4;
        setObjMenuPos({ x, y });
        setClickedPaletteObject(obj);
      }
    },
    [tsState.tilesets, deselectObject, selectedObject?.id, onSelectObject]
  );

  return (
    <>
      <ScrollArea.Autosize
        p="xs"
        type="auto"
        offsetScrollbars
        h="100%"
        style={{ flex: 1, minHeight: 0 }}
      >
        {objects.length > 0 && (
          <TextInput
            placeholder="Filter objects"
            leftSection={<IconSearch size={16} />}
            mb="sm"
          />
        )}

        <LoadingOverlay
          visible={tsState.loadingPalette}
          zIndex={1000}
          overlayProps={{ blur: 2 }}
        />
        <div
          onPointerDown={onPointerDown}
          onContextMenu={onContextMenu}
          style={{ paddingBottom: 75 }}
        >
          {objects}
        </div>
      </ScrollArea.Autosize>
      <Portal>
        <TileGroupMenu
          pos={objMenuPos}
          group={clickedPaletteObject}
          closeMenu={() => setObjMenuPos(null)}
          onTagsModalOpened={deselectObject}
        />
      </Portal>
    </>
  );
}
