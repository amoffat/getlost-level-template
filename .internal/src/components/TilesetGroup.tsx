import { useAppSelector } from "@/hooks/redux";
import { selectors } from "@/slices/tilesetEditor";
import { TileGroupTemplate } from "@/types/tilegroup";
import classNames from "classnames";
import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import styles from "./styles/TilesetGroup.module.css";

export interface TilesetCropProps extends React.HTMLAttributes<HTMLDivElement> {
  group: TileGroupTemplate;
  className?: string;
  scale: number;
  // If true, the sprite is scaled down as needed to fit within the parent
  // container's bounds. If false (the default), the requested scale is used
  // verbatim.
  bounded?: boolean;
  style?: React.CSSProperties;
  title?: string;
  selected?: boolean;
  flipX?: boolean; // flip horizontally
}

const TilesetGroup = ({
  group,
  className,
  style,
  scale,
  bounded = false,
  selected,
  flipX = false,
  ...divProps
}: TilesetCropProps) => {
  const objectUrl = useAppSelector(
    (state) =>
      selectors.selectTileset(state, state.tilesetEditor.objIdToTs[group.id])
        ?.objectUrl,
  );

  const width = Math.max(0, group.pos.width);
  const height = Math.max(0, group.pos.height);
  const bgPos = `-${group.pos.x}px -${group.pos.y}px`;

  // Measure the parent container to avoid rendering larger than available space
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState<{ w: number; h: number }>({
    w: Number.POSITIVE_INFINITY,
    h: Number.POSITIVE_INFINITY,
  });

  // Measure the parent so a bounded sprite never renders larger than the space
  // available. useLayoutEffect measures before paint, avoiding a first-frame
  // flash. We re-measure on window resize, which also covers Split-pane
  // drag-end (the editor dispatches a synthetic 'resize' event when a pane
  // finishes resizing). Unbounded groups ignore parent size entirely.
  useLayoutEffect(() => {
    if (!bounded) return;
    const parent = wrapperRef.current?.parentElement;
    if (!parent) return;

    const measure = () => {
      const rect = parent.getBoundingClientRect();
      setContainerSize({ w: rect.width, h: rect.height });
    };
    measure();

    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [bounded]);

  // Unbounded groups render at the requested scale verbatim. Bounded groups
  // clamp it so the sprite never overflows its parent. (A zero-size group makes
  // the divisions below Infinity, which Math.min simply ignores.)
  const effectiveScale = useMemo(() => {
    if (!bounded) return scale;
    if (
      !Number.isFinite(containerSize.w) ||
      !Number.isFinite(containerSize.h)
    ) {
      return scale;
    }
    const maxFittingScale = Math.min(
      containerSize.w / width,
      containerSize.h / height,
    );
    return Math.min(scale, maxFittingScale);
  }, [bounded, containerSize.w, containerSize.h, width, height, scale]);

  // This can happen in deferred renders, where a TilesetGroup may stick around
  // for a renders after its tileset has been deleted. Specifically, this
  // happens in the ObjectPalette when a tileset is deleted.
  if (!objectUrl) return null;

  return (
    <div
      ref={wrapperRef}
      className={styles.wrapper}
      style={{ width: width * effectiveScale, height: height * effectiveScale }}
      {...divProps}
    >
      <div
        className={classNames(styles.crop, className, {
          [styles.selected]: selected,
        })}
        style={{
          width,
          height,
          backgroundImage: `url(${objectUrl})`,
          backgroundPosition: bgPos,
          transform: flipX
            ? `scale(${effectiveScale}) translateX(${width}px) scaleX(-1)`
            : `scale(${effectiveScale})`,
          transformOrigin: "top left",
          imageRendering: "pixelated",
          ...(style ?? {}),
        }}
      />
    </div>
  );
};

export default TilesetGroup;
