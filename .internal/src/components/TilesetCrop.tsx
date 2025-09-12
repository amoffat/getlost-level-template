import classNames from "classnames";
import React from "react";
import { Rect } from "../types/rect";
import styles from "./styles/TilesetCrop.module.css";

export interface TilesetCropProps {
  src: string;
  coords: Rect;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  onClick?: () => void;
}

export default function TilesetCrop({
  src,
  coords: group,
  className,
  style,
  onClick,
}: TilesetCropProps) {
  const width = Math.max(0, group.br.x - group.ul.x);
  const height = Math.max(0, group.br.y - group.ul.y);
  const bgPos = `-${group.ul.x}px -${group.ul.y}px`;

  return (
    <div
      className={classNames(styles.crop, className)}
      onClick={onClick}
      style={{
        width,
        height,
        backgroundImage: `url(${src})`,
        backgroundPosition: bgPos,
        ...(style ?? {}),
      }}
    />
  );
}
