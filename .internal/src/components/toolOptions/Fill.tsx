import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { actions } from "@/slices/mapEditor";
import { commitObjectsThunk } from "@/thunks/map";
import {
  mapUiToWeight,
  mapWeightToUi,
  rebalanceAfterChange,
  removeWeight,
  resizeWeights,
  type Weights,
} from "@/utils/normalizedSliders";
import {
  Alert,
  Button,
  CloseButton,
  Fieldset,
  Group,
  Slider,
  Stack,
  Table,
  Text,
} from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { shallowEqual } from "react-redux";
import TilesetGroup from "../TilesetGroup";
import Tip from "../Tip";

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export default function Fill() {
  const {
    candidates: cands,
    clump: clumpFromStore,
    bounds,
  } = useAppSelector((state) => state.mapEditor.toolOptions.fill, shallowEqual);
  const dispatch = useAppDispatch();

  // Store fractional weights per frame (0..1), always normalized so sum == 1
  const [weights, setWeights] = useState<Weights>([]);
  const [clump, setClump] = useState<number>(clumpFromStore);

  const n = cands.length;
  const hasFrames = n > 0;

  const scaleFn = useCallback((v: number) => mapUiToWeight(v, n), [n]);
  const uiFromWeight = useCallback((t: number) => mapWeightToUi(t, n), [n]);

  const tips: ReactNode[] = useMemo(() => {
    const t = [];
    if (cands.length === 0) {
      t.push(
        "The fill tool allows you to fill an enclosed area with a weighted random selection of tiles."
      );
      t.push("Select tile groups that you want to use in the fill.");
    } else {
      t.push(
        "Adjust the sliders to set the probability that each tile will be placed at a given location in the fill area."
      );
    }
    return t;
  }, [cands.length]);

  const pixelArea = useMemo(() => {
    if (!bounds) return 0;
    return bounds.width * bounds.height;
  }, [bounds]);

  const dynamicUpdate = pixelArea <= 300 * 300;

  // Keep weights in sync with candidate count (index-based). Preserve existing
  // prefix, assign a small fair share to new frames, then normalize.
  //
  // queueMicrotask is for the linter, which prefers that an effect not update
  // the state during render.
  useEffect(() => {
    queueMicrotask(() => {
      setWeights((prev) => resizeWeights(prev, cands.length));
    });
  }, [cands.length]);

  // Sync local clump state with Redux store
  useEffect(() => {
    setClump(clumpFromStore);
  }, [clumpFromStore]);

  const finalizeWeights = useCallback(
    (weights: Weights) => {
      const newCands = cands.map((cand, idx) => ({
        ...cand,
        prob: clamp01(weights[idx] ?? 0),
      }));
      dispatch(
        actions.setToolOptions({
          tool: "fill",
          options: {
            candidates: newCands,
          },
        })
      );
    },
    [cands, dispatch]
  );

  // Rebalance all weights when a single slider is changed so that the sum
  // across frames remains exactly 1.0. We preserve other frames' relative
  // proportions by scaling them uniformly.
  const updateWeight = (idx: number, target: number) => {
    setWeights((prev) => {
      if (prev.length === 0) return [1];
      const current: Weights = prev.slice();
      const weights = rebalanceAfterChange(current, idx, target);
      return weights;
    });
  };

  const removeFrame = (idx: number) => {
    setWeights((prev) => removeWeight(prev, idx));
    dispatch(
      actions.setToolOptions({
        tool: "fill",
        options: { candidates: cands.filter((_, i) => i !== idx) },
      })
    );
  };

  useEffect(() => {
    if (dynamicUpdate) {
      finalizeWeights(weights);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dynamicUpdate, weights]);

  const commitChanges = () => {
    dispatch(commitObjectsThunk());
  };

  const updateClump = (value: number) => {
    dispatch(
      actions.setToolOptions({
        tool: "fill",
        options: { clump: value },
      })
    );
  };

  return (
    <>
      <Tip tips={tips} />
      <Fieldset legend="Fill Tool Options" p="xs">
        <Stack p={0} gap="xs">
          {!hasFrames && (
            <Alert
              title="No tiles selected"
              variant="light"
              icon={<IconInfoCircle />}
            >
              Please select tile groups from the palette.
            </Alert>
          )}

          {hasFrames && (
            <Table w="100%" withRowBorders={false} layout="fixed">
              <Table.Tbody>
                {cands.map((cand, idx) => {
                  const w = weights[idx] ?? 0;
                  const uiValue = uiFromWeight(w);

                  return (
                    <Table.Tr key={`${cand.tg.id}-${idx}`}>
                      <Table.Td w="20%" p="xs">
                        <TilesetGroup group={cand.tg} scale={2} bounded />
                      </Table.Td>
                      <Table.Td w="80%" p="xs">
                        <Group gap="xs" wrap="nowrap" align="center" p={0}>
                          <Slider
                            size="sm"
                            style={{ flex: 1 }}
                            min={0}
                            max={1}
                            step={0.01}
                            scale={scaleFn}
                            value={uiValue}
                            onChange={(v) => {
                              const targetWeight = scaleFn(v);
                              updateWeight(idx, targetWeight);
                            }}
                            onChangeEnd={(_v) => {
                              if (!dynamicUpdate) {
                                finalizeWeights(weights);
                              }
                            }}
                            label={(scaledWeight) => {
                              const clamped = clamp01(scaledWeight);
                              return `${Math.round(clamped * 100)}%`;
                            }}
                            disabled={cands.length <= 1}
                          />
                          <CloseButton
                            size="xs"
                            onClick={() => removeFrame(idx)}
                          />
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          )}

          <Stack gap="xs">
            <Text size="sm" fw={500}>
              Clump similar objects
            </Text>
            <Slider
              min={0}
              max={1}
              step={0.01}
              value={clump}
              disabled={!hasFrames}
              onChange={(v) => {
                if (dynamicUpdate) {
                  updateClump(v);
                } else {
                  setClump(v);
                }
              }}
              onChangeEnd={(v) => {
                if (!dynamicUpdate) {
                  updateClump(v);
                }
              }}
            />
          </Stack>

          <Button
            variant="filled"
            fullWidth
            disabled={!hasFrames}
            onClick={commitChanges}
          >
            Commit changes
          </Button>
        </Stack>
      </Fieldset>
    </>
  );
}
