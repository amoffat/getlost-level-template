import * as constants from "@/constants";
import { useAppDispatch } from "@/hooks/redux";
import { actions, selectors as dSelectors } from "@/slices/dialogue";
import { RootState } from "@/store/store";
import { Choice, DialogueData, DNode } from "@/types/dialogue";
import { closestCenter, DndContext, DragEndEvent } from "@dnd-kit/core";
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Button,
  CloseButton,
  Fieldset,
  Group,
  Input,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { IconGripVertical } from "@tabler/icons-react";
import {
  Handle,
  NodeToolbar,
  Position,
  useUpdateNodeInternals,
  type NodeProps,
} from "@xyflow/react";
import classNames from "classnames";
import {
  ReactNode,
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
  >({}); // Measured pixel positions for each handle
  const node = useSelector((state: RootState) =>
    dSelectors.selectNode(state, id),
  );

  const data = node?.data as DialogueData | undefined;
  const choicesData = useMemo(() => data?.choices ?? [], [data?.choices]);

  const onTextChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      const content = event.currentTarget.value;
      dispatch(actions.setNodeData({ id, data: { content } }));
    },
    [id, dispatch],
  );

  const addChoice = useCallback(() => {
    const newChoice: Choice = {
      id: crypto.randomUUID(),
      text: undefined,
    };
    const choices = [...choicesData, newChoice];
    dispatch(actions.setNodeData({ id, data: { choices } }));
  }, [id, dispatch, choicesData]);

  const removeChoice = useCallback(
    (choiceId: string) => {
      const choices = choicesData.filter((c) => c.id !== choiceId);
      dispatch(actions.setNodeData({ id, data: { choices } }));
    },
    [id, dispatch, choicesData],
  );

  const updateChoiceText = useCallback(
    (choiceId: string, text: string) => {
      const choices = choicesData.map((c) =>
        c.id === choiceId ? { ...c, text } : c,
      );
      dispatch(actions.setNodeData({ id, data: { choices } }));
    },
    [id, dispatch, choicesData],
  );

  const reorderChoices = useCallback(
    (fromIndex: number, toIndex: number) => {
      const newChoices = [...choicesData];
      const [removed] = newChoices.splice(fromIndex, 1);
      newChoices.splice(toIndex, 0, removed);
      dispatch(actions.setNodeData({ id, data: { choices: newChoices } }));
    },
    [id, dispatch, choicesData],
  );

  useEffect(() => {
    if (!selected) {
      const filteredChoices = choicesData.filter((c) => Boolean(c.text));
      if (filteredChoices.length !== choicesData.length) {
        dispatch(
          actions.setNodeData({ id, data: { choices: filteredChoices } }),
        );
      }
    }
  }, [selected, choicesData, dispatch, id]);

  // Measures the vertical center of each choice TextInput and calculates the
  // handle position. This runs whenever the layout changes (resize, selection
  // state, etc.) to keep handles perfectly aligned with their associated
  // choices.
  const measureHandlePositions = useCallback(() => {
    const container = nodeRef.current;
    if (!container) return;

    const nextHandleTopByChoiceId: Record<string, number> = {};

    for (const choice of choicesData) {
      const choiceElement = choiceRefs.current[choice.id];
      if (!choiceElement) continue;

      // Use offsetTop for position relative to the node container
      const offsetTop = choiceElement.offsetTop;
      const offsetHeight = choiceElement.offsetHeight;
      nextHandleTopByChoiceId[choice.id] = offsetTop + offsetHeight / 2;
    }

    // Only update state if positions actually changed to avoid unnecessary re-renders
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

  // Set up ResizeObserver to automatically remeasure handle positions whenever
  // the layout changes.
  useLayoutEffect(() => {
    const container = nodeRef.current;
    if (!container) return;

    // Initial measurement after DOM has updated
    const frameId = requestAnimationFrame(() => {
      measureHandlePositions();
    });

    // Watch for any size changes in the node or its children
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

  // Render handles with measured positions. Each handle needs a unique id for
  // React Flow to route edges correctly. Fallback to percentage positioning
  // until measurement completes.
  const handles = choicesData.map((c) => {
    if (!c.text) {
      return null;
    }
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

  // Wrap each choice in a div with a ref so we can measure its position.
  // The wrapper is needed because Mantine's TextInput doesn't expose a ref to its root element.
  const choices = choicesData.map((c) => {
    const text: ReactNode = c.text;
    if (selected) {
      return (
        <SortableChoice
          key={c.id}
          id={c.id}
          choice={c}
          onRefChange={(element) => {
            choiceRefs.current[c.id] = element;
          }}
          updateChoiceText={updateChoiceText}
          removeChoice={removeChoice}
        />
      );
    }
    return (
      <div
        key={c.id}
        ref={(element) => {
          choiceRefs.current[c.id] = element;
        }}
      >
        {text}
      </div>
    );
  });

  const canAddChoice = choicesData.length < constants.maxDialogueChoices;

  let content: ReactNode = <Text>{data.content}</Text>;
  let choicesContainer: ReactNode;

  if (choices.length > 0) {
    choicesContainer = (
      <Fieldset legend="Player responds..." p="xs">
        <Stack p={0} gap="xs">
          {choices}
        </Stack>
      </Fieldset>
    );
  }

  let title: ReactNode = <Text>{data.label}</Text>;
  if (selected) {
    choicesContainer = (
      <Fieldset legend="Responses" p="xs">
        <Input.Description mb="xs">
          These are possible responses the player can choose from.
        </Input.Description>
        <DndContext
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          onDragEnd={(event: DragEndEvent) => {
            const { active, over } = event;
            if (!over || active.id === over.id) return;
            const fromIndex = choicesData.findIndex((c) => c.id === active.id);
            const toIndex = choicesData.findIndex((c) => c.id === over.id);
            if (fromIndex !== -1 && toIndex !== -1) {
              reorderChoices(fromIndex, toIndex);
            }
          }}
        >
          <Stack p={0}>
            <SortableContext
              items={choicesData.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <Stack p={0} gap="xs">
                {choices}
              </Stack>
            </SortableContext>

            {canAddChoice && (
              <Button
                className="nodrag"
                variant="subtle"
                size="xs"
                fullWidth
                onClick={addChoice}
              >
                Add response
              </Button>
            )}
          </Stack>
        </DndContext>
      </Fieldset>
    );
    title = <TextInput className="nodrag" defaultValue={data.label} />;
    content = (
      <Textarea
        classNames={{ input: "nodrag" }}
        rows={4}
        label="Dialogue content"
        description="The text that will be displayed to the player."
        defaultValue={data?.content ?? ""}
        onChange={onTextChange}
      />
    );
  }

  return (
    <>
      <NodeToolbar
        position={Position.Bottom}
        align="start"
        className="nowheel"
      ></NodeToolbar>

      <div ref={nodeRef} className={cls}>
        <Handle type="target" position={Position.Left} />
        <Stack p={0}>
          {title}
          {content}
          {choicesContainer}
        </Stack>
        {handles}
      </div>
    </>
  );
}

type SortableChoiceProps = {
  id: string;
  choice: Choice;
  onRefChange: (element: HTMLDivElement | null) => void;
  updateChoiceText: (choiceId: string, text: string) => void;
  removeChoice: (choiceId: string) => void;
};

function SortableChoice({
  id,
  choice,
  onRefChange,
  updateChoiceText,
  removeChoice,
}: SortableChoiceProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={(element) => {
        setNodeRef(element);
        onRefChange(element);
      }}
      style={style}
    >
      <Group gap="xs" wrap="nowrap">
        <IconGripVertical
          className="nodrag"
          size={16}
          style={{ cursor: "grab" }}
          {...attributes}
          {...listeners}
        />
        <TextInput
          defaultValue={choice.text}
          style={{ flex: 1 }}
          placeholder="Type response"
          onChange={(event) => updateChoiceText(id, event.currentTarget.value)}
        />
        <CloseButton size="xs" onClick={() => removeChoice(id)} />
      </Group>
    </div>
  );
}
