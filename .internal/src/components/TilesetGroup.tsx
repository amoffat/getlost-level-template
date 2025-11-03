import { useAppSelector } from "@/hooks/redux";
import { TileGroupTemplate } from "@/types/tilegroup";
import classNames from "classnames";
import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./styles/TilesetGroup.module.css";

export interface TilesetCropProps extends React.HTMLAttributes<HTMLDivElement> {
  group: TileGroupTemplate;
  className?: string;
  scale: number;
  // If true (default), autoscaling will be bounded by the parent container's
  // bounding rect. If false, we will ignore the parent size and simply use the
  // provided scale value as-is (with a safe fallback when it's not finite).
  bounded?: boolean;
  style?: React.CSSProperties;
  title?: string;
  selected?: boolean;
}

const TilesetGroup = ({
  group,
  className,
  style,
  scale,
  bounded = false,
  selected,
  ...divProps
}: TilesetCropProps) => {
  const tilesets = useAppSelector((state) => state.tilesetEditor.tilesets);
  const ts = tilesets[group.tilesetId];

  const width = Math.max(0, group.pos.br.x - group.pos.ul.x);
  const height = Math.max(0, group.pos.br.y - group.pos.ul.y);
  const bgPos = `-${group.pos.ul.x}px -${group.pos.ul.y}px`;

  // Measure the parent container to avoid rendering larger than available space
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState<{ w: number; h: number }>({
    w: Number.POSITIVE_INFINITY,
    h: Number.POSITIVE_INFINITY,
  });

  useEffect(() => {
    if (!bounded) {
      // When unbounded, ignore parent size completely
      queueMicrotask(() =>
        setContainerSize({
          w: Number.POSITIVE_INFINITY,
          h: Number.POSITIVE_INFINITY,
        })
      );
      return;
    }

    const el = wrapperRef.current;
    const parent = el?.parentElement;
    if (!parent) return;

    // Initial measure
    const rect = parent.getBoundingClientRect();
    queueMicrotask(() => setContainerSize({ w: rect.width, h: rect.height }));

    // Observe parent size changes
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cr = entry.contentRect;
        setContainerSize({ w: cr.width, h: cr.height });
      }
    });
    ro.observe(parent);
    return () => ro.disconnect();
  }, [bounded]);

  // Compute a scale that fits within the parent while honoring requested scale
  const effectiveScale = useMemo(() => {
    const isAuto = !Number.isFinite(scale);
    // If we don't yet know container size or content size is zero
    if (width === 0 || height === 0) return isAuto && !bounded ? 1 : scale;

    // When auto (scale === Infinity), compute the best fit scale based on container
    if (isAuto) {
      if (!bounded) {
        // Unbounded + auto: no parent to constrain to; fall back to 1x
        return 1;
      }
      if (!isFinite(containerSize.w) || !isFinite(containerSize.h)) return 1;
      const maxScaleW = containerSize.w / width;
      const maxScaleH = containerSize.h / height;
      return Math.min(maxScaleW, maxScaleH);
    }

    // Otherwise clamp requested scale to fit within container
    if (!bounded) return scale;
    if (!isFinite(containerSize.w) || !isFinite(containerSize.h)) return scale;
    const maxScaleW = containerSize.w / width;
    const maxScaleH = containerSize.h / height;
    const maxFittingScale = Math.min(maxScaleW, maxScaleH);
    return Math.min(scale, maxFittingScale);
  }, [bounded, containerSize.w, containerSize.h, width, height, scale]);

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
          backgroundImage: `url(${ts.objectUrl})`,
          backgroundPosition: bgPos,
          transform: `scale(${effectiveScale})`,
          transformOrigin: "top left",
          imageRendering: "pixelated",
          ...(style ?? {}),
        }}
      />
    </div>
  );
};

export default TilesetGroup;
