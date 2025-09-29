import { actions } from "@/slices/mapEditor";
import { Vector } from "@/vec";
import { LoadingOverlay, Portal, ScrollArea, TextInput } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import React, { JSX, useCallback, useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "../hooks/redux";
import { TileGroup } from "../types/tilegroup";
import { Tileset } from "../types/tileset";
import TileGroupMenu from "./TileGroupMenu";
import TilesetGroup from "./TilesetGroup";

interface ObjectPaletteProps {
  tileset?: Tileset | null;
  selected?: TileGroup | null;
  onSelectObject?: (obj: TileGroup, e: React.MouseEvent) => void;
  onDeselectObject?: () => void;
}

export default function ObjectPalette({
  selected = null,
  onSelectObject,
  onDeselectObject,
  tileset: showTileset,
}: ObjectPaletteProps) {
  const [objMenuPos, setObjMenuPos] = useState<Vector | null>(null);
  const [clickedPaletteObject, setClickedPaletteObject] =
    useState<TileGroup | null>(null);
  const tsState = useAppSelector((state) => state.tilesetEditor);
  const dispatch = useAppDispatch();

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

  const onPlaceClick = (e: React.MouseEvent) => {
    const obj = clickedPaletteObject;
    dispatch(actions.setPlace(obj));
    dispatch(actions.setMode("place"));
  };

  const selectObject = useCallback(
    (obj: TileGroup, e: React.MouseEvent) => {
      const el = e.target as HTMLElement;
      const rect = el.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 4;
      setObjMenuPos({ x, y });
      setClickedPaletteObject(obj);

      onSelectObject?.(obj, e);
    },
    [onSelectObject]
  );

  const deselectObject = useCallback(() => {
    setObjMenuPos(null);
    onDeselectObject?.();
  }, [onDeselectObject]);

  useEffect(() => {
    const escapeHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        deselectObject();
      }
    };
    window.addEventListener("keydown", escapeHandler);
    window.addEventListener("click", deselectObject);
    return () => {
      window.removeEventListener("keydown", escapeHandler);
      window.removeEventListener("click", deselectObject);
    };
  }, [deselectObject]);

  const onClick = useCallback(
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
      if (obj === selected) {
        deselectObject();
      } else {
        selectObject(obj, e);
      }
    },
    [selected, selectObject, deselectObject, tsState.tilesets]
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
        <div onClick={onClick} style={{ paddingBottom: 75 }}>
          {objects}
        </div>
      </ScrollArea.Autosize>
      <Portal>
        <TileGroupMenu
          pos={objMenuPos}
          group={clickedPaletteObject}
          onPlaceClick={onPlaceClick}
          closeMenu={() => setObjMenuPos(null)}
        />
      </Portal>
    </>
  );
}
