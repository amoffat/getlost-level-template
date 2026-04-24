import { overlayProps } from "@/constants";
import { useAppSelector } from "@/hooks/redux";
import { selectors } from "@/slices/tilesetEditor";
import { RootState, store } from "@/store/store";
import { isAnimationTemplate } from "@/types/animation";
import { isNpcTemplate } from "@/types/npc";
import { PaletteObjectProps } from "@/types/palette";
import { isTileGroupTemplate } from "@/types/tilegroup";
import { Tileset } from "@/types/tileset";
import { TemplateObject } from "@/types/tilesetobject";
import { setsEqual } from "@/utils/set";
import { Vector2 } from "@/vec";
import {
  Group,
  LoadingOverlay,
  Portal,
  ScrollArea,
  Slider,
  TextInput,
} from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { shallowEqual } from "react-redux";
import ObjectAnimationMenu from "./paletteMenus/ObjectAnimationMenu";
import ObjectNpcMenu from "./paletteMenus/ObjectNpcMenu";
import TileGroupMenu from "./paletteMenus/TileGroupMenu";

interface ObjectPaletteProps<ObjType extends TemplateObject> {
  tileset?: Tileset;
  selectedObjects?: Set<string>;
  minScale?: number;
  maxScale?: number;
  defaultScale?: number;
  filterMenu?: React.ReactNode;
  onSelectObject?: (obj: ObjType, e: React.MouseEvent) => void;
  onDeselectObject?: () => void;
  renderObject: (props: PaletteObjectProps<ObjType>) => React.ReactNode | null;
  sort: (a: ObjType, b: ObjType) => number;
  filter: (
    obj: ObjType,
    state: RootState["ui"]["paletteFilterSwitches"],
  ) => boolean;
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

function ObjectPalette<ObjType extends TemplateObject>({
  tileset: visibleTileset,
  selectedObjects,
  minScale = 1,
  maxScale = 4,
  defaultScale = 2,
  filterMenu,
  onSelectObject,
  onDeselectObject,
  renderObject,
  sort,
  filter,
}: ObjectPaletteProps<ObjType>) {
  const { t } = useTranslation();
  const [objMenuPos, setObjMenuPos] = useState<Vector2 | null>(null);
  const [clicked, setClicked] = useState<ObjType | null>(null);
  const tilesets = useAppSelector(selectors.selectTilesets);
  const loadingPalette = useAppSelector((state) => state.ui.loadingPalette);
  const paletteFilterSwitches = useAppSelector(
    (state) => state.ui.paletteFilterSwitches,
    shallowEqual,
  );
  const [scale, setScale] = useState(defaultScale);

  // Step 1: Filter and sort objects (independent of rendering concerns like scale/selection)
  const sortedObjects = useMemo(() => {
    const filteredTilesets: Tileset[] = Object.values(tilesets).filter((t) => {
      if (visibleTileset) {
        return t.id === visibleTileset.id;
      }
      return true;
    });

    const sorted = Object.values(filteredTilesets)
      .flatMap((ts) => Object.values(ts.tiles.entities))
      .map((obj) => obj as ObjType)
      .filter((obj) => filter(obj, paletteFilterSwitches))
      .sort(sort);

    // It is possible for multiple tilesets to contain the same tile group
    // (having the same id), because the id is a hash of the image data.
    const seen = new Set<string>();
    const deduplicated: ObjType[] = [];

    for (const obj of sorted) {
      if (seen.has(obj.id)) continue;
      seen.add(obj.id);

      // Prevent visual duplicates from appearing in the palette. This *could*
      // be the source of a bug if a user places a tile group from one tileset,
      // adds another tileset with the same image, and then expects to be able
      // to find the original tile group in the palette to edit it. However,
      // this is a very edge case and the benefits of preventing visual
      // duplicates outweigh the risks.
      if (isTileGroupTemplate(obj)) {
        if (seen.has(obj.imageId)) continue;
        seen.add(obj.imageId);
      }

      deduplicated.push(obj);
    }

    return deduplicated;
  }, [tilesets, visibleTileset, sort, filter, paletteFilterSwitches]);

  const objects = useMemo(() => {
    const renderedObjects: React.ReactNode[] = [];
    for (const obj of sortedObjects) {
      const selected = selectedObjects?.has(obj.id) ?? false;
      const rendered = renderObject({
        scale,
        obj,
        selected,
      });
      renderedObjects.push(rendered);
    }
    return renderedObjects;
  }, [sortedObjects, selectedObjects, renderObject, scale]);

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

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

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

      const state = store.getState();
      const tilesets = selectors.selectTilesets(state);

      const obj = tilesets[tsId].tiles.entities[objId];
      // Left click to select, right click to open menu
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

        if (
          isTileGroupTemplate(obj) ||
          isAnimationTemplate(obj) ||
          isNpcTemplate(obj)
        ) {
          setClicked(obj as ObjType);
        } else {
          setClicked(null);
        }

        onSelectObject?.(obj as ObjType, e);
      }
    },
    [deselectObject, selectedObjects, onSelectObject],
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
        <Group mb="sm" me="sm" gap="xs">
          {filterMenu}
          <TextInput
            flex="3"
            placeholder={t("objectPaletteFilterByTags")}
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

        <LoadingOverlay
          visible={loadingPalette}
          zIndex={1000}
          overlayProps={overlayProps}
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
        />
        <ObjectAnimationMenu
          pos={objMenuPos}
          obj={clicked && isAnimationTemplate(clicked) ? clicked : null}
          closeMenu={() => setObjMenuPos(null)}
        />
        <ObjectNpcMenu
          pos={objMenuPos}
          obj={clicked && isNpcTemplate(clicked) ? clicked : null}
          closeMenu={() => setObjMenuPos(null)}
        />
      </Portal>
    </>
  );
}

export default memo(ObjectPalette, (prevProps, nextProps) => {
  // Re-compute if the selected objects are not the same
  const objsEqual = setsEqual(
    prevProps.selectedObjects ?? new Set(),
    nextProps.selectedObjects ?? new Set(),
  );

  // Re-compute if the tileset or its tiles have changed, without diving into
  // the individual object properties.
  const prevTs = prevProps.tileset;
  const nextTs = nextProps.tileset;
  const sameTilesetId = prevTs?.id === nextTs?.id;
  const oldTiles = new Set(prevTs?.tiles.ids ?? []);
  const newTiles = new Set(nextTs?.tiles.ids ?? []);

  const sameTilesetTiles = setsEqual(oldTiles, newTiles);

  return (
    sameTilesetId &&
    sameTilesetTiles &&
    objsEqual &&
    prevProps.minScale === nextProps.minScale &&
    prevProps.maxScale === nextProps.maxScale &&
    prevProps.defaultScale === nextProps.defaultScale &&
    prevProps.filterMenu === nextProps.filterMenu &&
    prevProps.onSelectObject === nextProps.onSelectObject &&
    prevProps.onDeselectObject === nextProps.onDeselectObject &&
    prevProps.renderObject === nextProps.renderObject &&
    prevProps.sort === nextProps.sort &&
    prevProps.filter === nextProps.filter
  );
}) as typeof ObjectPalette;
