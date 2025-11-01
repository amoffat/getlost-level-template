import { TileAnimationFrame } from "@/types/animation";
import { useEffect, useState } from "react";
import TilesetGroup, { TilesetCropProps } from "./TilesetGroup";

export interface TileAnimationProps {
  frames: TileAnimationFrame[];
  // Visual props forwarded to TilesetGroup
  scale: number;
  className?: string;
  style?: React.CSSProperties;
  // Playback controls
  loop?: boolean; // repeat when reaching end
  playing?: boolean; // start/stop animation
  startIndex?: number; // initial frame index
  // Callbacks
  onFrameChange?: (index: number) => void;
  onEnd?: () => void; // called when a non-looping animation reaches the end
}

type TgProps = Pick<TilesetCropProps, "bounded" | "selected">;

const TileAnimation = ({
  frames,
  scale,
  className,
  style,
  loop = true,
  playing = true,
  startIndex = 0,
  onFrameChange,
  onEnd,
  ...tgOpts
}: TileAnimationProps & TgProps) => {
  const [index, setIndex] = useState<number>(() =>
    Math.min(Math.max(startIndex, 0), Math.max(frames.length - 1, 0))
  );

  // Reset the index when frames list or startIndex changes
  useEffect(() => {
    const next = Math.min(
      Math.max(startIndex, 0),
      Math.max(frames.length - 1, 0)
    );
    queueMicrotask(() => {
      setIndex(next);
    });
  }, [frames, startIndex]);

  // Drive the frame timer
  useEffect(() => {
    if (!playing || frames.length === 0) return;

    const current = frames[index];
    // Guard invalid time values
    const delay = Math.max(
      0,
      Number.isFinite(current?.time) ? current.time : 0
    );

    const tid = window.setTimeout(() => {
      setIndex((prev) => {
        const next = prev + 1;
        if (next < frames.length) {
          onFrameChange?.(next);
          return next;
        }
        // reached end
        if (loop && frames.length > 0) {
          onFrameChange?.(0);
          return 0;
        }
        // stop at end if not looping
        onEnd?.();
        return prev; // keep last frame
      });
    }, delay);

    return () => window.clearTimeout(tid);
  }, [playing, frames, index, loop, onEnd, onFrameChange]);

  if (!frames || frames.length === 0) return null;

  const frame = frames[index] ?? frames[frames.length - 1];

  return (
    <TilesetGroup
      group={frame.tg}
      scale={scale}
      className={className}
      style={style}
      {...tgOpts}
    />
  );
};

export default TileAnimation;
