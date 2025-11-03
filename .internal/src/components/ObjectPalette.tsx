import { useAppSelector } from "@/hooks/redux";
import { isAnimationTemplate } from "@/types/animation";
import { PaletteObjectProps } from "@/types/palette";
import { isTileGroupTemplate } from "@/types/tilegroup";
import { Tileset } from "@/types/tileset";
import { TilesetObjectTemplate } from "@/types/tilesetobject";
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
import ObjectAnimationMenu from "./paletteMenus/ObjectAnimationMenu";
import TileGroupMenu from "./paletteMenus/TileGroupMenu";

interface ObjectPaletteProps<ObjType extends TilesetObjectTemplate> {
  tileset?: Tileset | null;
  onSelectObject?: (obj: ObjType, e: React.MouseEvent) => void;
  onDeselectObject?: () => void;
  selectedObjects?: Set<string>;
  renderObject: (props: PaletteObjectProps<ObjType>) => React.ReactNode | null;
  sort: (a: ObjType, b: ObjType) => number;
  filter: (obj: ObjType) => boolean;
  minScale?: number;
  maxScale?: number;
  defaultScale?: number;
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

export default function ObjectPalette<ObjType extends TilesetObjectTemplate>({
  onSelectObject,
  onDeselectObject,
  tileset: showTileset,
  selectedObjects,
  renderObject,
  sort,
  filter,
  minScale = 1,
  maxScale = 4,
  defaultScale = 2,
}: ObjectPaletteProps<ObjType>) {
  const [objMenuPos, setObjMenuPos] = useState<Vector | null>(null);
  const [clicked, setClicked] = useState<ObjType | null>(null);
  const tilesets = useAppSelector((state) => state.tilesetEditor.tilesets);
  const loadingPalette = useAppSelector((state) => state.ui.loadingPalette);
  const [scale, setScale] = useState(defaultScale);

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
      .map((obj) => obj as ObjType)
      .filter(filter)
      .sort(sort);

    // It is possible for multiple tilesets to contain the same tile group
    // (having the same id), because the id is a hash of the image data.
    const seen = new Set<string>();

    for (const obj of sorted) {
      if (seen.has(obj.id)) continue;
      seen.add(obj.id);

      const selected = selectedObjects?.has(obj.id) ?? false;
      const rendered = renderObject({
        scale,
        obj: obj as ObjType,
        selected,
      });
      if (rendered) {
        objs.push(rendered);
      }
    }

    return objs;
  }, [
    tilesets,
    showTileset,
    selectedObjects,
    renderObject,
    scale,
    sort,
    filter,
  ]);

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
          onSelectObject?.(obj as ObjType, e);
        }
      } else if (e.button === 2) {
        const el = e.target as HTMLElement;
        const rect = el.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 4;
        setObjMenuPos({ x, y });

        if (isTileGroupTemplate(obj) || isAnimationTemplate(obj)) {
          setClicked(obj as ObjType);
        } else {
          setClicked(null);
        }

        onSelectObject?.(obj as ObjType, e);
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
              disabled
            />
            <Slider
              flex="1"
              min={minScale}
              max={maxScale}
              step={0.25}
              value={scale}
              onChange={setScale}
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
          obj={clicked && isTileGroupTemplate(clicked) ? clicked : null}
          closeMenu={() => setObjMenuPos(null)}
          onTagsModalOpened={deselectObject}
        />
        <ObjectAnimationMenu
          pos={objMenuPos}
          obj={clicked && isAnimationTemplate(clicked) ? clicked : null}
          closeMenu={() => setObjMenuPos(null)}
        />
      </Portal>
    </>
  );
}
