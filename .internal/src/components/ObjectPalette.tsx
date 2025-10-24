import { area } from "@/types/rect";
import { Vector } from "@/vec";
import {
  ActionIcon,
  Group,
  LoadingOverlay,
  Portal,
  ScrollArea,
  TextInput,
} from "@mantine/core";
import { IconSearch, IconZoomIn, IconZoomOut } from "@tabler/icons-react";
import React, { JSX, useCallback, useEffect, useMemo, useState } from "react";
import { useAppSelector } from "../hooks/redux";
import { TileGroup } from "../types/tilegroup";
import { Tileset } from "../types/tileset";
import TileGroupMenu from "./TileGroupMenu";
import TilesetGroup from "./TilesetGroup";

interface ObjectPaletteProps {
  tileset?: Tileset | null;
  onSelectObject?: (obj: TileGroup, e: React.MouseEvent) => void;
  onDeselectObject?: () => void;
  selectedObjects?: Set<string>;
}

function sortBySizeDescending(a: TileGroup, b: TileGroup): number {
  const aArea = area(a.pos);
  const bArea = area(b.pos);
  if (aArea !== bArea) return bArea - aArea;

  // if areas are equal, sort by tileset id
  if (a.tilesetId !== b.tilesetId) {
    return a.tilesetId.localeCompare(b.tilesetId);
  }

  if (a.hilbertIndex !== b.hilbertIndex) {
    return b.hilbertIndex - a.hilbertIndex;
  }

  // otherwise sort by id to ensure consistent order
  return a.id.localeCompare(b.id);
}

export default function ObjectPalette({
  onSelectObject,
  onDeselectObject,
  tileset: showTileset,
  selectedObjects,
}: ObjectPaletteProps) {
  const [objMenuPos, setObjMenuPos] = useState<Vector | null>(null);
  const [clickedPaletteObject, setClickedPaletteObject] =
    useState<TileGroup | null>(null);
  const tilesets = useAppSelector((state) => state.tilesetEditor.tilesets);
  const loadingPalette = useAppSelector((state) => state.ui.loadingPalette);
  const [scale, setScale] = useState(1);

  const objects: JSX.Element[] = useMemo(() => {
    const objs: JSX.Element[] = [];

    const filteredTilesets: Tileset[] = Object.values(tilesets).filter((t) => {
      if (showTileset) {
        return t.id === showTileset.id;
      } else if (showTileset === null) {
        return false;
      } else {
        return true;
      }
    });

    const sorted = Object.values(filteredTilesets)
      .flatMap((ts) => Object.values(ts.tiles.entities))
      .sort(sortBySizeDescending);

    // It is possible for multiple tilesets to contain the same tile group
    // (having the same id), because the id is a hash of the image data.
    const seen = new Set<string>();

    for (const group of sorted) {
      if (seen.has(group.id)) continue;
      seen.add(group.id);

      const key = `${group.tilesetId}-${group.id}`;
      objs.push(
        <TilesetGroup
          scale={scale}
          key={key}
          group={group}
          selected={selectedObjects?.has(group.id)}
        />
      );
    }

    return objs;
  }, [tilesets, showTileset, selectedObjects, scale]);

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

      const obj = tilesets[tsId].tiles.entities[objId];
      if (e.button === 0) {
        if (selectedObjects?.has(objId)) {
          deselectObject();
        } else {
          onSelectObject?.(obj, e);
        }
      } else if (e.button === 2) {
        const el = e.target as HTMLElement;
        const rect = el.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 4;
        setObjMenuPos({ x, y });
        setClickedPaletteObject(obj);

        // Also select the object
        onSelectObject?.(obj, e);
      }
    },
    [tilesets, deselectObject, selectedObjects, onSelectObject]
  );

  const zoomInClick = useCallback(() => {
    setScale((s) => Math.min(4, s + 0.25));
  }, []);

  const zoomOutClick = useCallback(() => {
    setScale((s) => Math.max(0.25, s - 0.25));
  }, []);

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
          <Group mb="sm" me="sm">
            <TextInput
              flex="1"
              placeholder="Filter objects"
              leftSection={<IconSearch size={16} />}
            />
            <Group gap="xs">
              <ActionIcon
                size="input-sm"
                variant="default"
                onClick={zoomInClick}
              >
                <IconZoomIn />
              </ActionIcon>
              <ActionIcon
                size="input-sm"
                variant="default"
                onClick={zoomOutClick}
              >
                <IconZoomOut />
              </ActionIcon>
            </Group>
          </Group>
        )}

        <LoadingOverlay
          visible={loadingPalette}
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
          obj={clickedPaletteObject}
          closeMenu={() => setObjMenuPos(null)}
          onTagsModalOpened={deselectObject}
        />
      </Portal>
    </>
  );
}
