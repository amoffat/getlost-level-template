import { useAppDispatch } from "@/hooks/redux";
import { actions, selectors as dSelectors } from "@/slices/dialogue";
import { selectors as mapSelectors } from "@/slices/mapEditor";
import { RootState } from "@/store/store";
import { DNode, SpeechData } from "@/types/dialogue";
import { SpeakableMapObj } from "@/types/map";
import { Fieldset, Stack, Text } from "@mantine/core";
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
} from "react";
import { useSelector } from "react-redux";
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

  const activeDialogueId = useSelector(
    (state: RootState) => state.dialogue.activeDialogueId,
  )!;
  const node = useSelector((state: RootState) =>
    dSelectors.selectNode(state, id),
  );

  const data = node?.data as SpeechData | undefined;
  const choicesData = useMemo(() => data?.choices ?? [], [data?.choices]);

  const dialogue = useSelector((state: RootState) =>
    dSelectors.selectDialogue(state, activeDialogueId),
  )!;

  const obj = useSelector((state: RootState) => {
    if (!dialogue?.subjectId) return undefined;
    return mapSelectors.selectObject(state, dialogue.subjectId);
  }) as SpeakableMapObj | undefined;
  const label = data?.label ?? obj?.name ?? "Sign";

  // Clean up empty choices when deselected
  useEffect(() => {
    if (!selected) {
      const filteredChoices = choicesData.filter((c) => Boolean(c.text));
      if (filteredChoices.length !== choicesData.length && activeDialogueId) {
        dispatch(
          actions.setNodeData({
            dialogueId: activeDialogueId,
            id,
            data: { choices: filteredChoices },
          }),
        );
      }
    }
  }, [selected, choicesData, dispatch, id, activeDialogueId]);

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

  const handles = choicesData.map((c) => {
    if (!c.text) return null;
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

  const cls = classNames(styles.node, {
    "react-flow__node-default": true,
    [styles.selected]: selected,
    nowheel: true,
  });

  const visibleChoices = choicesData.filter((c) => Boolean(c.text));

  let choicesContainer = null;
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
              <Text size="sm">{c.text}</Text>
            </div>
          ))}
        </Stack>
      </Fieldset>
    );
  }

  return (
    <>
      <NodeToolbar
        position={Position.Bottom}
        align="start"
        className="nowheel"
      />

      <div ref={nodeRef} className={cls}>
        <Handle type="target" position={Position.Left} />
        <Stack p={0}>
          <Text fw={600}>{label}</Text>
          <Text>{data.content}</Text>
          {choicesContainer}
        </Stack>
        {handles}
      </div>
    </>
  );
}
