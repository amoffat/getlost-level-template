import { LocalizedTextarea } from "@/components/l10n";
import * as constants from "@/constants";
import { requiredNpcAnimations as requiredNpcAnimationSlots } from "@/constants";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
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
import TileAnimation from "../../TileAnimation";
import Tip from "../../Tip";

export default function NpcTool() {
  const ts = useAppSelector(selectors.activeTileset);
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

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
  const [flipXState, setFlipXState] = useState<Record<string, boolean>>(() => {
    const state: Record<string, boolean> = {};
    for (const animName of requiredNpcAnimationSlots) {
      state[animName] = existingNpc?.animations[animName]?.flipX ?? false;
    }
    return state;
  });

  const toggleFlipX = useCallback((animName: string) => {
    setFlipXState((prev) => ({
      ...prev,
      [animName]: !prev[animName],
    }));
  }, []);

  // Every slot name present across the tileset's animations. Required slots are
  // always listed first (even when unused) so the validation UI can flag them;
  // any additional custom slots follow.
  const allSlotNames = useMemo<string[]>(() => {
    const extras = new Set<string>();
    if (ts) {
      const allAnimations = Object.values(ts.tiles.entities).filter(
        isAnimationTemplate,
      );
      for (const anim of allAnimations) {
        for (const name of anim.slotNames) {
          if (
            !requiredNpcAnimationSlots.includes(name as NpcRequiredAnimation)
          ) {
            extras.add(name);
          }
        }
      }
    }
    return [...requiredNpcAnimationSlots, ...extras];
  }, [ts]);

  // Collect ALL animations matching each slot (not just the first)
  const allSlotAnimations = useMemo<Record<string, AnimationTemplate[]>>(() => {
    const result: Record<string, AnimationTemplate[]> = {};
    const allAnimations = ts
      ? Object.values(ts.tiles.entities).filter(isAnimationTemplate)
      : [];
    for (const slot of allSlotNames) {
      result[slot] = allAnimations.filter((anim) =>
        anim.slotNames.includes(slot),
      );
    }
    return result;
  }, [ts, allSlotNames]);

  // Non-required slots present in the tileset. Shown as an informational list
  // the user can flip but not exclude.
  const extraSlotNames = useMemo<string[]>(
    () =>
      allSlotNames.filter(
        (name) =>
          !requiredNpcAnimationSlots.includes(name as NpcRequiredAnimation),
      ),
    [allSlotNames],
  );

  // Track which animation index is selected per slot
  const [selectedIndex, setSelectedIndex] = useState<Record<string, number>>(
    () => {
      const state: Record<string, number> = {};
      for (const slot of requiredNpcAnimationSlots) {
        state[slot] = 0;
      }
      return state;
    },
  );

  const cycleAnimation = useCallback(
    (slot: string) => {
      setSelectedIndex((prev) => {
        const count = allSlotAnimations[slot].length;
        if (count <= 1) return prev;
        return { ...prev, [slot]: (prev[slot] + 1) % count };
      });
    },
    [allSlotAnimations],
  );

  // Derive current animation matches from selected indices. Covers every slot
  // present in the tileset, not just the required NPC slots.
  const animationMatches = useMemo<Partial<NpcAnimationRecord>>(() => {
    const matches: Partial<NpcAnimationRecord> = {};
    for (const slot of allSlotNames) {
      const candidates = allSlotAnimations[slot];
      const idx = (selectedIndex[slot] ?? 0) % Math.max(candidates.length, 1);
      const match = candidates[idx];
      if (match) {
        matches[slot] = {
          animation: match,
          flipX: flipXState[slot] ?? false,
        };
      }
    }
    return matches;
  }, [allSlotNames, allSlotAnimations, selectedIndex, flipXState]);

  const saveNpc = useCallback(() => {
    const animations: NpcAnimationRecord = {
      // Include every animation slot found in the tileset (custom slots too)...
      ...animationMatches,
      // ...while guaranteeing the required slots are present (canSave enforces this).
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
      message: t("npcToolNotifMessage"),
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

  // Shared "Animation" cell: preview (click to cycle when >1 candidate) plus a
  // flip-horizontal toggle. Falls back to a "Create" link when nothing matches.
  const renderAnimationCell = (
    slot: string,
    animRecord: Partial<NpcAnimationRecord>[string],
  ) =>
    animRecord ? (
      <Group gap="xs">
        <div
          style={{
            cursor: allSlotAnimations[slot].length > 1 ? "pointer" : "default",
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
      <Anchor underline="hover" size="xs" onClick={activateAnimationTool}>
        {t("npcToolCreate")}
      </Anchor>
    );

  return (
    <>
      <Tip tips={tips} />
      <form onSubmit={handleSubmit}>
        <Fieldset legend={t("npcToolLegend")} p="xs">
          <Stack p={0} gap="md">
            <LocalizedTextarea
              label={t("npcToolNameLabel")}
              description={t("npcToolNameDesc")}
              placeholder={t("npcToolNamePlaceholder")}
              defaultContext={t("npcPropNameContext")}
              disabled={!hasAll}
              contentKey={nameKey ?? undefined}
              onLocaleRefChange={(newRef) => setNameKey(newRef)}
            />

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
                        <Text size="sm">
                          <Group gap="xs">
                            {animRecord ? (
                              <IconCheck size={16} color="green" />
                            ) : (
                              <IconAlertTriangle size={16} color="orange" />
                            )}
                            {slot}
                          </Group>
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        {renderAnimationCell(slot, animRecord)}
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>

            {extraSlotNames.length > 0 && (
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{t("npcToolTableExtra")}</Table.Th>
                    <Table.Th>{t("npcToolTableAnimation")}</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {extraSlotNames.map((slot) => {
                    const animRecord = animationMatches[slot];
                    return (
                      <Table.Tr key={slot}>
                        <Table.Td>
                          <Text size="sm">
                            <Group gap="xs">
                              <IconCheck size={16} color="green" />
                              {slot}
                            </Group>
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          {renderAnimationCell(slot, animRecord)}
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            )}

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
