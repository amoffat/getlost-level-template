import { Slider } from "@mantine/core";
import { useCallback, useMemo } from "react";

export type GridsizeSliderProps = {
  labels: number[];
  onChangeEnd: (size: number) => void;
};

export default function GridsizeSlider({
  labels,
  onChangeEnd,
}: GridsizeSliderProps) {
  const denom = useMemo(() => Math.max(1, labels.length - 1), [labels]);
  const step = useMemo(() => 100 / denom, [denom]);

  const marks = useMemo(
    () =>
      labels.map((size, i) => ({
        value: (i / denom) * 100,
        label: String(size),
      })),
    [labels, denom]
  );

  // Prefer a default close to 16 if available (common tilesize), else center
  const defaultIndex = useMemo(() => {
    if (!labels.length) return 0;
    const target = 16;
    let bestIdx = 0;
    let bestDelta = Math.abs(labels[0] - target);
    for (let i = 1; i < labels.length; i++) {
      const d = Math.abs(labels[i] - target);
      if (d < bestDelta) {
        bestDelta = d;
        bestIdx = i;
      }
    }
    return bestIdx;
  }, [labels]);

  const gridIndexToSliderValue = useCallback(
    (idx: number) => (idx / denom) * 100,
    [denom]
  );

  const sliderValueToIndex = useCallback(
    (value: number) => {
      const raw = (value / 100) * denom;
      const idx = Math.round(raw);
      return Math.min(Math.max(idx, 0), Math.max(0, labels.length - 1));
    },
    [denom, labels.length]
  );

  const handleChangeEnd = useCallback(
    (value: number) => {
      const index = sliderValueToIndex(value);
      const size = labels[index] ?? labels[0];
      onChangeEnd(size);
    },
    [labels, onChangeEnd, sliderValueToIndex]
  );

  return (
    <Slider
      onChangeEnd={handleChangeEnd}
      defaultValue={gridIndexToSliderValue(defaultIndex)}
      step={step}
      label={null}
      marks={marks}
    />
  );
}
