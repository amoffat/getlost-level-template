import { playerParticipantId } from "@/constants";
import { useAppSelector } from "@/hooks/redux";
import { selectors as localeSelectors } from "@/slices/locale";
import { selectors as mapSelectors } from "@/slices/mapEditor";
import {
  selectPropertyValue,
  speakers as speakersSelector,
} from "@/store/selectors";
import { SpeakableMapObj } from "@/types/map";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

/**
 * Resolves the display name for a participant id (the localized character name,
 * the player name, or the raw id as a fallback).
 */
export function useParticipantName(participantId: string | null): string {
  const { t } = useTranslation();
  const activeEntries = useAppSelector(localeSelectors.selectActiveEntries);
  const defaultEntries = useAppSelector(localeSelectors.selectDefaultEntries);
  const nameKey = useAppSelector((state) => {
    if (!participantId || participantId === playerParticipantId) return null;
    const obj = mapSelectors.selectObject(state, participantId) as
      | SpeakableMapObj
      | undefined;
    if (!obj) return null;
    return selectPropertyValue(state, obj, "nameKey") ?? null;
  });

  if (participantId === playerParticipantId) return t("dialoguePlayerName");
  if (!participantId) return "";
  if (!nameKey) return participantId;
  return (
    activeEntries[nameKey]?.v ?? defaultEntries[nameKey]?.v ?? participantId
  );
}

/**
 * Returns the selectable participant options for Speaker/Listener dropdowns:
 * the player (always first) followed by every talkable, named character.
 */
export function useParticipantList(): { value: string; label: string }[] {
  const { t } = useTranslation();
  const speakers = useAppSelector(speakersSelector);

  return useMemo(() => {
    const opts = speakers
      .map(([label, obj]) => ({ value: obj.id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return [
      { value: playerParticipantId, label: t("dialoguePlayerName") },
      ...opts,
    ];
  }, [speakers, t]);
}
