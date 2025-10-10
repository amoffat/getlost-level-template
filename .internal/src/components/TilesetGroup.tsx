import { useAppSelector } from "@/hooks/redux";
import { TileGroup } from "@/types/tilegroup";
import classNames from "classnames";
import React from "react";
import styles from "./styles/TilesetGroup.module.css";

export interface TilesetCropProps extends React.HTMLAttributes<HTMLDivElement> {
  group: TileGroup;
  className?: string;
  scale?: number;
  style?: React.CSSProperties;
  title?: string;
  selected?: boolean;
}

const TilesetGroup = ({
  group,
  className,
  style,
  scale = 1,
  selected,
  ...others
}: TilesetCropProps) => {
  const tilesets = useAppSelector((state) => state.tilesetEditor.tilesets);
  const ts = tilesets[group.tilesetId];

  const width = Math.max(0, group.pos.br.x - group.pos.ul.x);
  const height = Math.max(0, group.pos.br.y - group.pos.ul.y);
  const bgPos = `-${group.pos.ul.x}px -${group.pos.ul.y}px`;
  const border = selected ? "1px solid rgba(0, 255, 0, 1)" : undefined;

  return (
    <div
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
          border,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          imageRendering: "pixelated",
          ...(style ?? {}),
        }}
        {...others}
      />
    </div>
  );
};

export default TilesetGroup;
