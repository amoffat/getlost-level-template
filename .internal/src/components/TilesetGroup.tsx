import classNames from "classnames";
import React from "react";
import { Rect } from "../types/rect";
import styles from "./styles/TilesetGroup.module.css";

export interface TilesetCropProps extends React.HTMLAttributes<HTMLDivElement> {
  id: string;
  src: string;
  coords: Rect;
  className?: string;
  scale?: number;
  style?: React.CSSProperties;
  title?: string;
}

const TilesetGroup = React.forwardRef<HTMLDivElement, TilesetCropProps>(
  function TilesetGroup(
    {
      id,
      src,
      coords: group,
      className,
      style,
      scale = 1,
      ...others
    }: TilesetCropProps,
    ref
  ) {
    const width = Math.max(0, group.br.x - group.ul.x);
    const height = Math.max(0, group.br.y - group.ul.y);
    const bgPos = `-${group.ul.x}px -${group.ul.y}px`;

    return (
      <div
        ref={ref}
        className={styles.wrapper}
        style={{ width: width * scale, height: height * scale }}
      >
        <div
          data-objid={id}
          className={classNames(styles.crop, className)}
          style={{
            width,
            height,
            backgroundImage: `url(${src})`,
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
