import * as constants from "@/constants";
import { requiredNpcAnimations as requiredNpcAnimationSlots } from "@/constants";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { selectors as localeSelectors } from "@/slices/locale";
import { actions, selectors } from "@/slices/tilesetEditor";
import { actions as uiActions } from "@/slices/ui";
import { setToolThunk } from "@/thunks/tileset";
import type { AnimationTemplate } from "@/types/animation";
import { isAnimationTemplate } from "@/types/animation";
import {
  isNpcTemplate,
  type NpcAnimationRecord,
  type NpcRequiredAnimation,
  type NpcTemplate,
} from "@/types/npc";
import { TemplateType } from "@/types/templates";
import {
  ActionIcon,
  Anchor,
  Button,
  Fieldset,
  Group,
  Stack,
  Table,
  Text,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconAlertTriangle,
  IconCheck,
  IconFlipVertical,
} from "@tabler/icons-react";
import { ReactNode, useCallback, useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import LocalizedTextInput from "../../l10n/LocalizedTextInput";
import TileAnimation from "../../TileAnimation";
import Tip from "../../Tip";

export default function NpcTool() {
  const ts = useAppSelector(selectors.activeTileset);
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const currentLocale = useAppSelector(localeSelectors.activeLocale);

  const existingNpc = useMemo(() => {
    const npcs = ts?.tiles.ids
      .map((id) => ts?.tiles.entities[id])
      .filter(isNpcTemplate);
    return npcs?.at(0);
  }, [ts]);

  const [nameKey, setNameKey] = useState<string | null>(
    existingNpc?.nameKey ?? null,
  );

  // Track flipX state for each animation, initialized from existingNpc if available
  const [flipXState, setFlipXState] = useState<
    Record<NpcRequiredAnimation, boolean>
  >(() => {
    const state = {} as Record<NpcRequiredAnimation, boolean>;
    for (const animName of requiredNpcAnimationSlots) {
      state[animName] = existingNpc?.animations[animName]?.flipX ?? false;
    }
    return state;
  });

  const toggleFlipX = useCallback((animName: NpcRequiredAnimation) => {
    setFlipXState((prev) => ({
      ...prev,
      [animName]: !prev[animName],
    }));
  }, []);

  // Collect ALL animations matching each slot (not just the first)
  const allSlotAnimations = useMemo<
    Record<NpcRequiredAnimation, AnimationTemplate[]>
  >(() => {
    const result = {} as Record<NpcRequiredAnimation, AnimationTemplate[]>;
    if (!ts) {
      for (const slot of requiredNpcAnimationSlots) result[slot] = [];
      return result;
    }
    const allAnimations = Object.values(ts.tiles.entities).filter(
      isAnimationTemplate,
    );
    for (const slot of requiredNpcAnimationSlots) {
      result[slot] = allAnimations.filter((anim) =>
        anim.slotNames.includes(slot),
      );
    }
    return result;
  }, [ts]);

  // Track which animation index is selected per slot
  const [selectedIndex, setSelectedIndex] = useState<
    Record<NpcRequiredAnimation, number>
  >(() => {
    const state = {} as Record<NpcRequiredAnimation, number>;
    for (const slot of requiredNpcAnimationSlots) {
      state[slot] = 0;
    }
    return state;
  });

  const cycleAnimation = useCallback(
    (slot: NpcRequiredAnimation) => {
      setSelectedIndex((prev) => {
        const count = allSlotAnimations[slot].length;
        if (count <= 1) return prev;
        return { ...prev, [slot]: (prev[slot] + 1) % count };
      });
    },
    [allSlotAnimations],
  );

  // Derive current animation matches from selected indices
  const animationMatches = useMemo<Partial<NpcAnimationRecord>>(() => {
    const matches: Partial<NpcAnimationRecord> = {};
    for (const slot of requiredNpcAnimationSlots) {
      const candidates = allSlotAnimations[slot];
      const idx = selectedIndex[slot] % Math.max(candidates.length, 1);
      const match = candidates[idx];
      if (match) {
        matches[slot] = {
          animation: match,
          flipX: flipXState[slot],
        };
      }
    }
    return matches;
  }, [allSlotAnimations, selectedIndex, flipXState]);

  const saveNpc = useCallback(() => {
    const animations: NpcAnimationRecord = {
      Idle: animationMatches["Idle"]!,
      WalkUp: animationMatches["WalkUp"]!,
      WalkDown: animationMatches["WalkDown"]!,
      WalkLeft: animationMatches["WalkLeft"]!,
      WalkRight: animationMatches["WalkRight"]!,
    };

    const id = crypto.randomUUID();

    // Defaults
    const npc: NpcTemplate = {
      id,
      type: TemplateType.Npc,
      animations,
      tilesetId: ts!.id,
      gridSize: animations["Idle"].animation.gridSize,
      nameKey,
      talkable: true,
      tags: [],
      walkSpeed: constants.defaultNpcWalkSpeed,
      flipX: false,
      tint: null,
      hidden: false,
      groundOffset: 0,
      defaultAnimation: "Idle",
      dampenWalkCollisions: constants.defaultNpcDampen,
      status: null,
      speakerImageId: null,
    };
    // Merge in existing properties of existing
    Object.assign(npc, existingNpc ?? {});
    // Set creation values
    Object.assign(npc, { nameKey, animations });

    dispatch(actions.setPaletteObjects({ tsId: ts!.id, objs: [npc] }));
    dispatch(uiActions.setTilesetTab("npcs"));

    notifications.show({
      title: t("npcToolNotifTitle"),
      message: t("npcToolNotifMessage", { name: nameKey }),
      autoClose: 3000,
    });
  }, [animationMatches, existingNpc, nameKey, ts, dispatch, t]);

  const handleSubmit = useCallback(
    (e: React.SubmitEvent) => {
      e.preventDefault();
      saveNpc();
    },
    [saveNpc],
  );

  const [hasAll, hasSome, hasNone] = useMemo(() => {
    let hasAll = true;
    let hasSome = false;
    let hasNone = true;
    for (const requiredSlot of requiredNpcAnimationSlots) {
      if (animationMatches[requiredSlot] === undefined) {
        hasAll = false;
      } else {
        hasSome = true;
        hasNone = false;
      }
    }
    return [hasAll, hasSome, hasNone];
  }, [animationMatches]);

  const activateAnimationTool = useCallback(() => {
    dispatch(setToolThunk("animate"));
  }, [dispatch]);

  const tips: ReactNode[] = useMemo(() => {
    const tipItems: ReactNode[] = [];

    if (hasAll) {
      tipItems.push(t("npcToolTipAllAssigned"));
    } else if (hasNone || hasSome) {
      tipItems.push(t("npcToolTipDefineAnimations"));
      tipItems.push(
        <Trans i18nKey="npcToolTipUseAnimator">
          To create a required animation, use the{" "}
          <Anchor underline="hover" onClick={activateAnimationTool}>
            Animator tool.
          </Anchor>
        </Trans>,
      );
    }
    return tipItems;
  }, [activateAnimationTool, hasAll, hasSome, hasNone, t]);

  const canSave = hasAll && nameKey !== null;

  return (
    <>
      <Tip tips={tips} />
      <form onSubmit={handleSubmit}>
        <Fieldset legend={t("npcToolLegend")} p="xs">
          <Stack p={0} gap="md">
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t("npcToolTableRequired")}</Table.Th>
                  <Table.Th>{t("npcToolTableAnimation")}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {requiredNpcAnimationSlots.map((slot) => {
                  const animRecord = animationMatches[slot];
                  return (
                    <Table.Tr key={slot}>
                      <Table.Td>
                        <Text
                          size="sm"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                          }}
                        >
                          {animRecord ? (
                            <IconCheck size={16} color="green" />
                          ) : (
                            <IconAlertTriangle size={16} color="orange" />
                          )}
                          {slot}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        {animRecord ? (
                          <Group gap="xs">
                            <div
                              style={{
                                cursor:
                                  allSlotAnimations[slot].length > 1
                                    ? "pointer"
                                    : "default",
                              }}
                              onClick={() => cycleAnimation(slot)}
                            >
                              <TileAnimation
                                frames={animRecord.animation.frames}
                                scale={2}
                                bounded
                                flipX={animRecord.flipX}
                              />
                            </div>

                            <Tooltip label={t("npcToolFlipTooltip")}>
                              <ActionIcon
                                variant={animRecord.flipX ? "filled" : "subtle"}
                                size="sm"
                                onClick={() => toggleFlipX(slot)}
                              >
                                <IconFlipVertical size={14} />
                              </ActionIcon>
                            </Tooltip>
                          </Group>
                        ) : (
                          <Anchor
                            underline="hover"
                            size="xs"
                            onClick={activateAnimationTool}
                          >
                            {t("npcToolCreate")}
                          </Anchor>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>

            <LocalizedTextInput
              label={t("npcToolNameLabel")}
              description={t("npcToolNameDesc")}
              placeholder={t("npcToolNamePlaceholder")}
              disabled={!hasAll}
              currentLocale={currentLocale}
              contentKey={nameKey ?? undefined}
              onLocaleKeyChange={(newKey) => setNameKey(newKey)}
              contextButton="label"
            />

            <Button
              variant="filled"
              fullWidth
              mt="md"
              disabled={!canSave}
              type="submit"
            >
              {existingNpc ? t("npcToolUpdateNpc") : t("npcToolCreateNpc")}
            </Button>
          </Stack>
        </Fieldset>
      </form>
    </>
  );
}
