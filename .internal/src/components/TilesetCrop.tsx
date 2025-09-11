import classNames from "classnames";
import React, { useEffect, useState } from "react";
import type { GroupCoords } from "../types/tilegroup";
import styles from "./styles/TilesetCrop.module.css";

export interface TilesetCropProps {
  src: string;
  group: GroupCoords;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}

export default function TilesetCrop({
  src,
  group,
  className,
  style,
}: TilesetCropProps) {
  const cropW = Math.max(0, group.br.x - group.ul.x);
  const cropH = Math.max(0, group.br.y - group.ul.y);

  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number }>();

  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    const img = new Image();
    img.decoding = "async";
    img.src = src;
    if (img.complete) {
      if (!cancelled)
        setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
    } else {
      img.onload = () => {
        if (!cancelled)
          setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
      };
      img.onerror = () => {
        if (!cancelled) setNaturalSize(undefined);
      };
    }
    return () => {
      cancelled = true;
    };
  }, [src]);

  return (
    <div
      className={classNames(styles.crop, className)}
      style={{
        // Fill parent width; keep crop aspect ratio
        width: "100%",
        aspectRatio: cropW && cropH ? `${cropW} / ${cropH}` : undefined,
        position: "relative",
        overflow: "hidden",
        ...(style ?? {}),
      }}
    >
      {naturalSize && cropW > 0 && cropH > 0 && (
        <img
          src={src}
          alt=""
          draggable={false}
          style={{
            position: "absolute",
            // Scale the full image relative to the crop width
            width: `${(naturalSize.w / cropW) * 100}%`,
            height: "auto",
            left: `-${(group.ul.x / cropW) * 100}%`,
            top: `-${(group.ul.y / cropH) * 100}%`,
            imageRendering: "pixelated",
            userSelect: "none",
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
}
