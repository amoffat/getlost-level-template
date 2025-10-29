import { PaletteObjectProps } from "@/types/palette";
import { area } from "@/types/rect";
import { Vector } from "@/vec";
import {
  Group,
  LoadingOverlay,
  Portal,
  ScrollArea,
  Slider,
  TextInput,
} from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import React, {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAppSelector } from "../hooks/redux";
import {
  isObjectAnimation,
  isTileGroup,
  TilesetObject,
} from "../types/tilegroup";
import { Tileset } from "../types/tileset";
import TileGroupMenu from "./TileGroupMenu";

interface ObjectPaletteProps {
  tileset?: Tileset | null;
  onSelectObject?: (obj: TilesetObject, e: React.MouseEvent) => void;
  onDeselectObject?: () => void;
  selectedObjects?: Set<string>;
  renderObject: (props: PaletteObjectProps) => React.ReactNode | null;
}

function sortBySizeDescending(a: TilesetObject, b: TilesetObject): number {
  let aIsAnimation = false;
  let bIsAnimation = false;

  if (isObjectAnimation(a)) {
    a = a.frames[0]!.tg;
    aIsAnimation = true;
  }
  if (isObjectAnimation(b)) {
    b = b.frames[0]!.tg;
    bIsAnimation = true;
  }

  const aArea = area(a.pos);
  const bArea = area(b.pos);
  if (aArea !== bArea) return bArea - aArea;

  // if areas are equal, sort by tileset id
  if (a.tilesetId !== b.tilesetId) {
    return a.tilesetId.localeCompare(b.tilesetId);
  }

  // Animations should come after static tile groups
  if (aIsAnimation !== bIsAnimation) {
    return aIsAnimation ? 1 : -1;
  }

  if (a.hilbertIndex !== b.hilbertIndex) {
    return b.hilbertIndex - a.hilbertIndex;
  }

  // otherwise sort by id to ensure consistent order
  return a.id.localeCompare(b.id);
}

function findHighestWithAttr(start: HTMLElement, attr: string) {
  let current: HTMLElement | null = start.closest(`[${attr}]`);
  let last: HTMLElement | null = null;

  while (current) {
    last = current;
    current = current.parentElement?.closest(`[${attr}]`) ?? null;
  }

  return last;
}

export default function ObjectPalette({
  onSelectObject,
  onDeselectObject,
  tileset: showTileset,
  selectedObjects,
  renderObject,
}: ObjectPaletteProps) {
  const [objMenuPos, setObjMenuPos] = useState<Vector | null>(null);
  const [clickedPaletteObject, setClickedPaletteObject] =
    useState<TilesetObject | null>(null);
  const tilesets = useAppSelector((state) => state.tilesetEditor.tilesets);
  const loadingPalette = useAppSelector((state) => state.ui.loadingPalette);
  const [scale, setScale] = useState(2);

  const objects: ReactNode[] = useMemo(() => {
    const objs: ReactNode[] = [];

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

    for (const obj of sorted) {
      if (seen.has(obj.id)) continue;
      seen.add(obj.id);

      const shouldDim =
        !selectedObjects?.has(obj.id) &&
        selectedObjects &&
        selectedObjects.size > 0;

      const rendered = renderObject({
        scale,
        obj,
        selected: selectedObjects?.has(obj.id) ?? false,
        dimmed: shouldDim,
      });
      if (rendered) {
        objs.push(rendered);
      }
    }

    return objs;
  }, [tilesets, showTileset, selectedObjects, renderObject, scale]);

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
      const target = findHighestWithAttr(e.target as HTMLElement, "data-objid");
      if (!target) {
        deselectObject();
        return;
      }

      e.stopPropagation();
      const objId = target.dataset.objid!;
      const tsId = target.dataset.tsid!;

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

        if (isTileGroup(obj)) {
          setClickedPaletteObject(obj);
        } else {
          setClickedPaletteObject(null);
        }

        // Also select the object
        onSelectObject?.(obj, e);
      }
    },
    [tilesets, deselectObject, selectedObjects, onSelectObject]
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
          <Group mb="sm" me="sm">
            <TextInput
              flex="3"
              placeholder="Filter objects"
              leftSection={<IconSearch size={16} />}
            />
            <Slider
              flex="1"
              min={0.5}
              max={4}
              step={0.25}
              value={scale}
              onChange={setScale}
              marks={[
                { value: 1, label: "1x" },
                { value: 2, label: "2x" },
                { value: 4, label: "4x" },
              ]}
              label={null}
            />
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
