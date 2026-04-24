import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { actions } from "@/slices/mapEditor";
import { commitObjectsThunk, setActiveLayerThunk } from "@/thunks/map";
import { MapLayerName } from "@/types/layer";
import {
  mapUiToWeight,
  mapWeightToUi,
  normalizeWeights,
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
import { useTranslation } from "react-i18next";
import TilesetGroup from "../../TilesetGroup";
import Tip from "../../Tip";

export default function FillTool() {
  const { t } = useTranslation();
  const {
    candidates: cands,
    density: storeDensity,
    bounds,
  } = useAppSelector((state) => state.mapEditor.toolOptions.fill, shallowEqual);
  const dispatch = useAppDispatch();

  // Store fractional weights per frame (0..1), always normalized so sum == 1
  const [weights, setWeights] = useState<Weights>(cands.map((c) => c.prob));
  const [density, setDensity] = useState<number>(storeDensity);

  const n = cands.length;
  const hasCands = n > 1; // 1 for transparent tile
  const selectedBounds = bounds !== null;
  const canCommit = hasCands && selectedBounds;

  const scaleFn = useCallback((v: number) => mapUiToWeight(v, n), [n]);
  const uiFromWeight = useCallback((t: number) => mapWeightToUi(t, n), [n]);

  const tips: ReactNode[] = useMemo(() => {
    const tipsList = [];
    if (!hasCands) {
      tipsList.push(t("fillToolTip1"));
    } else {
      tipsList.push(t("fillToolTip2"));
    }

    if (!selectedBounds) {
      tipsList.push(t("fillToolTip3"));
    }

    tipsList.push(t("fillToolTip4"));

    return tipsList;
  }, [hasCands, selectedBounds, t]);

  const dynamicUpdate = useMemo(() => {
    if (!bounds) return 0;
    const area = bounds.width * bounds.height;
    return area <= 300 * 300;
  }, [bounds]);

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

  useEffect(() => {
    const hasFirstCand = cands.length === 2;
    if (!hasFirstCand) return;

    const placeObj = cands[1]!.tg;
    const isSolidTile = placeObj.coverage === 1.0;
    const switchTo = isSolidTile ? MapLayerName.Ground : MapLayerName.Exterior;

    dispatch(setActiveLayerThunk({ layer: switchTo, notify: true }));
  }, [dispatch, cands]);

  // Sync local overlap state with Redux store
  useEffect(() => {
    setDensity(storeDensity);
  }, [storeDensity]);

  const finalizeWeights = useCallback(
    (weights: Weights) => {
      weights = normalizeWeights(weights);
      const newCands = cands.map((cand, idx) => ({
        ...cand,
        prob: weights[idx] ?? 0,
      }));
      dispatch(
        actions.setToolOptions({
          tool: "fill",
          options: {
            candidates: newCands,
          },
        }),
      );
    },
    [cands, dispatch],
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
      }),
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
    dispatch(
      actions.setToolOptions({
        tool: "fill",
        options: { bounds: null },
      }),
    );
  };

  const updateDensity = (value: number) => {
    dispatch(
      actions.setToolOptions({
        tool: "fill",
        options: { density: value },
      }),
    );
  };

  return (
    <>
      <Tip tips={tips} />
      <Fieldset legend={t("fillToolOptionsLegend")} p="xs">
        <Stack p={0} gap="xs">
          {!hasCands && (
            <Alert
              title={t("fillToolNoTilesTitle")}
              variant="light"
              icon={<IconInfoCircle />}
            >
              {t("fillToolNoTilesMsg")}
            </Alert>
          )}

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
                          label={null}
                          disabled={cands.length <= 1}
                        />
                        <CloseButton
                          size="xs"
                          disabled={!cand.canRemove}
                          onClick={() => removeFrame(idx)}
                        />
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>

          <Stack gap="xs" p={0}>
            <Text size="sm" fw={500}>
              {t("fillToolDensityLabel")}
            </Text>
            <Slider
              min={0}
              max={1}
              step={0.01}
              label={null}
              value={density}
              disabled={!canCommit}
              onChange={(v) => {
                if (dynamicUpdate) {
                  updateDensity(v);
                } else {
                  setDensity(v);
                }
              }}
              onChangeEnd={(v) => {
                if (!dynamicUpdate) {
                  updateDensity(v);
                }
              }}
            />
          </Stack>

          <Button
            variant="filled"
            fullWidth
            disabled={!canCommit}
            onClick={commitChanges}
          >
            {t("fillToolFillButton")}
          </Button>
        </Stack>
      </Fieldset>
    </>
  );
}
