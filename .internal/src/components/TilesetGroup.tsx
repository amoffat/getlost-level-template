import { TileGroup } from "@/types/tilegroup";
import { Tileset } from "@/types/tileset";
import classNames from "classnames";
import React from "react";
import styles from "./styles/TilesetGroup.module.css";

export interface TilesetCropProps extends React.HTMLAttributes<HTMLDivElement> {
  ts: Tileset;
  group: TileGroup;
  className?: string;
  scale?: number;
  style?: React.CSSProperties;
  title?: string;
}

const TilesetGroup = React.forwardRef<HTMLDivElement, TilesetCropProps>(
  function TilesetGroup(
    { group, ts, className, style, scale = 1, ...others }: TilesetCropProps,
    ref
  ) {
    const width = Math.max(0, group.pos.br.x - group.pos.ul.x);
    const height = Math.max(0, group.pos.br.y - group.pos.ul.y);
    const bgPos = `-${group.pos.ul.x}px -${group.pos.ul.y}px`;

    return (
      <div
        ref={ref}
        className={styles.wrapper}
        style={{ width: width * scale, height: height * scale }}
      >
        <div
          data-tsid={group.tilesetId}
          data-objid={group.id}
          className={classNames(styles.crop, className)}
          style={{
            width,
            height,
            backgroundImage: `url(${ts.objectUrl})`,
            backgroundPosition: bgPos,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            imageRendering: "pixelated",
            ...(style ?? {}),
          }}
          {...others}
        />
      </div>
    );
  }
);

export default TilesetGroup;
