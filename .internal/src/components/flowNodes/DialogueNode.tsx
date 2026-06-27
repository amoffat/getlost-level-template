import { playerParticipantId } from "@/constants";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { useParticipantName } from "@/hooks/useParticipant";
import { actions, selectors as dSelectors } from "@/slices/dialogue";
import { selectors as localeSelectors } from "@/slices/locale";
import { selectors as mapSelectors } from "@/slices/mapEditor";
import { selectPropertyValue } from "@/store/selectors";
import { RootState } from "@/store/store";
import { DNode, SpeechData } from "@/types/dialogue";
import { SpeakableMapObj } from "@/types/map";
import { Box, Fieldset, Group, Stack, Text, Tooltip } from "@mantine/core";
import {
  Handle,
  NodeToolbar,
  Position,
  useUpdateNodeInternals,
  type NodeProps,
} from "@xyflow/react";
import classNames from "classnames";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ParticipantAvatar } from "../dialogue/Participant";
import VariableText from "../VariableText";
import styles from "./styles/DialogueNode.module.css";

export default function DialogueNode({
  data: { id },
  selected,
}: NodeProps<DNode>) {
  const dispatch = useAppDispatch();
  const updateNodeInternals = useUpdateNodeInternals();

  const nodeRef = useRef<HTMLDivElement>(null);
  const choiceRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [handleTopByChoiceId, setHandleTopByChoiceId] = useState<
    Record<string, number>
  >({});

  const activeDialogueId = useAppSelector(
    (state: RootState) => state.dialogue.activeDialogueId,
  )!;
  const node = useAppSelector((state: RootState) =>
    dSelectors.selectNode(state, id),
  );

  const data = node?.data as SpeechData | undefined;
  const choicesData = useMemo(() => data?.choices ?? [], [data?.choices]);

  const dialogue = useAppSelector((state: RootState) =>
    dSelectors.selectDialogue(state, activeDialogueId),
  )!;

  // Speaker defaults to the dialogue subject; listener defaults to the player.
  const speakerId = data?.speakerId ?? dialogue?.subjectId ?? null;
  const listenerId = data?.listenerId ?? playerParticipantId;
  const isPlayerListener = listenerId === playerParticipantId;
  const speakerName = useParticipantName(speakerId);
  const listenerName = useParticipantName(listenerId);

  const obj = useAppSelector((state: RootState) => {
    if (!speakerId || speakerId === playerParticipantId) return undefined;
    return mapSelectors.selectObject(state, speakerId);
  }) as SpeakableMapObj | undefined;

  const activeEntries = useAppSelector(localeSelectors.selectActiveEntries);
  const defaultLocaleEntries = useAppSelector(
    localeSelectors.selectDefaultEntries,
  );

  const resolveText = useCallback(
    (key: string | null | undefined): string => {
      if (!key) return "";
      return activeEntries[key]?.v ?? defaultLocaleEntries[key]?.v ?? "";
    },
    [activeEntries, defaultLocaleEntries],
  );

  const objNameKey = useAppSelector((state) =>
    obj ? selectPropertyValue(state, obj, "nameKey") : undefined,
  );

  const label =
    (data?.speakerNameKey
      ? resolveText(data.speakerNameKey)
      : objNameKey
        ? resolveText(objNameKey)
        : undefined) ?? "";

  // Clean up empty choices when deselected
  useEffect(() => {
    if (!selected) {
      const filteredChoices = choicesData.filter((c) =>
        Boolean(resolveText(c.textKey)),
      );
      if (filteredChoices.length !== choicesData.length && activeDialogueId) {
        dispatch(
          actions.updateNodeData({
            dialogueId: activeDialogueId,
            id,
            data: { choices: filteredChoices },
          }),
        );
      }
    }
  }, [selected, choicesData, dispatch, id, activeDialogueId, resolveText]);

  // Measure handle positions for choice handles
  const measureHandlePositions = useCallback(() => {
    const container = nodeRef.current;
    if (!container) return;

    const nextHandleTopByChoiceId: Record<string, number> = {};

    for (const choice of choicesData) {
      const choiceElement = choiceRefs.current[choice.id];
      if (!choiceElement) continue;

      const offsetTop = choiceElement.offsetTop;
      const offsetHeight = choiceElement.offsetHeight;
      nextHandleTopByChoiceId[choice.id] = offsetTop + offsetHeight / 2;
    }

    setHandleTopByChoiceId((prev) => {
      const prevIds = Object.keys(prev);
      const nextIds = Object.keys(nextHandleTopByChoiceId);

      if (prevIds.length !== nextIds.length) return nextHandleTopByChoiceId;

      for (const choiceId of nextIds) {
        if (prev[choiceId] !== nextHandleTopByChoiceId[choiceId]) {
          return nextHandleTopByChoiceId;
        }
      }

      return prev;
    });

    updateNodeInternals(id);
  }, [choicesData, id, updateNodeInternals]);

  useLayoutEffect(() => {
    const container = nodeRef.current;
    if (!container) return;

    const frameId = requestAnimationFrame(() => {
      measureHandlePositions();
    });

    const observer = new ResizeObserver(() => {
      measureHandlePositions();
    });

    observer.observe(container);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, [choicesData, measureHandlePositions, selected]);

  if (!node) return null;
  if (!data) return null;

  const cls = classNames(styles.node, {
    "react-flow__node-default": true,
    [styles.selected]: selected,
  });

  // Only player-listener nodes branch via choices (one source handle per
  // choice). A non-player listener gets a single linear outgoing connection.
  let handles: ReactNode;
  let choicesContainer: ReactNode = null;
  if (isPlayerListener) {
    handles = choicesData.map((c) => {
      if (!c.textKey) return null;
      const measuredTop = handleTopByChoiceId[c.id];
      return (
        <Handle
          key={c.id}
          type="source"
          position={Position.Right}
          id={c.id}
          style={{ top: measuredTop }}
        />
      );
    });

    const visibleChoices = choicesData.filter((c) => Boolean(c.textKey));
    if (visibleChoices.length > 0) {
      choicesContainer = (
        <Fieldset legend="Player responds..." p="xs">
          <Stack p={0} gap="xs">
            {visibleChoices.map((c) => (
              <div
                key={c.id}
                ref={(element) => {
                  choiceRefs.current[c.id] = element;
                }}
              >
                <Text size="sm">
                  <VariableText text={resolveText(c.textKey)} />
                </Text>
              </div>
            ))}
          </Stack>
        </Fieldset>
      );
    }
  } else {
    handles = <Handle type="source" position={Position.Right} />;
  }

  const resolvedContent = resolveText(data.contentKey);
  let content = (
    <Text>
      <VariableText text={resolvedContent} />
    </Text>
  );
  if (!data.contentKey || !resolvedContent) {
    content = (
      <Text ta="center" pb="lg" c="red">
        Missing content
      </Text>
    );
  }

  return (
    <>
      <NodeToolbar position={Position.Bottom} align="start" />

      <div ref={nodeRef} className={cls}>
        {!data.isOrigin && <Handle type="target" position={Position.Left} />}
        <Stack p={0}>
          <Group gap="xs" wrap="nowrap" align="center">
            <Tooltip label={label || speakerName} withArrow>
              <Box w={38} h={38} style={{ flexShrink: 0 }}>
                <ParticipantAvatar
                  participantId={speakerId}
                  scale={2}
                  size={38}
                />
              </Box>
            </Tooltip>
            <Box style={{ flexGrow: 1 }} />
            <Tooltip label={listenerName} withArrow>
              <Box w={38} h={38} style={{ flexShrink: 0 }}>
                <ParticipantAvatar
                  participantId={listenerId}
                  scale={2}
                  size={38}
                />
              </Box>
            </Tooltip>
          </Group>
          {content}
          {choicesContainer}
        </Stack>
        {handles}
      </div>
    </>
  );
}
