import { overlayProps, requiredNpcAnimations } from "@/constants";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { actions } from "@/slices/tilesetEditor";
import { actions as uiActions } from "@/slices/ui";
import { setToolThunk } from "@/thunks/tileset";
import { isAnimationTemplate, type AnimationTemplate } from "@/types/animation";
import type {
  NpcAnimationRecord,
  NpcRequiredAnimation,
  NpcTemplate,
} from "@/types/npc";
import { TemplateType } from "@/types/templates";
import {
  Anchor,
  Button,
  Fieldset,
  Group,
  Modal,
  Stack,
  Table,
  TagsInput,
  Text,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconAlertTriangle, IconCheck } from "@tabler/icons-react";
import { ReactNode, useCallback, useEffect, useMemo } from "react";
import TileAnimation from "../TileAnimation";
import Tip from "../Tip";

interface FormValues {
  name: string;
  tags: string[];
}

export default function NpcOptions() {
  const tsId = useAppSelector((state) => state.tilesetEditor.activeTilesetId)!;
  const ts = useAppSelector((state) => state.tilesetEditor.tilesets[tsId]);
  const dispatch = useAppDispatch();
  const [saveModalOpened, { open: openSaveModal, close: closeSaveModal }] =
    useDisclosure(false);

  useEffect(() => {
    dispatch(uiActions.setTilesetTab("animations"));
  }, [dispatch]);

  const form = useForm<FormValues>({
    name: "npc",
    mode: "uncontrolled",
    onSubmitPreventDefault: "always",
    initialValues: {
      name: "",
      tags: [],
    },
    validate: {
      name: (value) => {
        if (value.trim().length === 0) {
          return "Name is required";
        }
        return null;
      },
    },
  });

  // Match each NPC animation name with animations from the tileset
  const animationMatches = useMemo<
    Partial<Record<NpcRequiredAnimation, AnimationTemplate>>
  >(() => {
    const allAnimations = Object.values(ts.tiles.entities).filter(
      isAnimationTemplate
    );
    const matches: Partial<Record<NpcRequiredAnimation, AnimationTemplate>> =
      {};
    for (const requiredName of requiredNpcAnimations) {
      const match = allAnimations.find((anim) =>
        anim.names.includes(requiredName)
      );
      if (match) {
        matches[requiredName] = match;
      }
    }
    return matches;
  }, [ts]);

  const formSubmit = form.onSubmit(async (values) => {
    closeSaveModal();

    const animations: NpcAnimationRecord = {
      Idle: animationMatches["Idle"]!,
      WalkUp: animationMatches["WalkUp"]!,
      WalkDown: animationMatches["WalkDown"]!,
      WalkLeft: animationMatches["WalkLeft"]!,
      WalkRight: animationMatches["WalkRight"]!,
    };

    const id = crypto.randomUUID();
    const npc: NpcTemplate = {
      id,
      type: TemplateType.Npc,
      animations,
      tilesetId: tsId,
      gridSize: animations["Idle"].gridSize,
      name: values.name,
      tags: values.tags,
      walkSpeed: 0.5,
      flipX: false,
    };

    dispatch(actions.addPaletteObjects({ tsId, objs: [npc] }));
    dispatch(uiActions.setTilesetTab("npcs"));

    notifications.show({
      title: "NPC saved",
      message: `Saved NPC "${values.name}".`,
      autoClose: 3000,
    });
    form.reset();
  });

  const [hasAll, hasSome, hasNone] = useMemo(() => {
    let hasAll = true;
    let hasSome = false;
    let hasNone = true;
    for (const requiredName of requiredNpcAnimations) {
      if (animationMatches[requiredName] === undefined) {
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
    const t = [];

    if (hasAll) {
      t.push(
        "Once every animation is assigned, click 'Create NPC' to finalize."
      );
    } else if (hasNone || hasSome) {
      t.push("Create an NPC by defining its required animations.");
      t.push(
        <>
          To create a required animation, use the{" "}
          <Anchor underline="hover" onClick={activateAnimationTool}>
            Animator tool.
          </Anchor>
        </>
      );
    }
    return t;
  }, [activateAnimationTool, hasAll, hasSome, hasNone]);

  const previewFrames = useMemo(() => {
    const frames = [];
    for (const requiredName of requiredNpcAnimations) {
      const animation = animationMatches[requiredName];
      if (animation) {
        frames.push(...animation.frames);
      }
    }
    return frames;
  }, [animationMatches]);

  return (
    <>
      <Tip tips={tips} />
      <Fieldset legend="NPC animations" p="xs">
        <Stack p={0} gap="md">
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Required</Table.Th>
                <Table.Th>Animation</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {requiredNpcAnimations.map((name) => {
                const animation = animationMatches[name];
                return (
                  <Table.Tr key={name}>
                    <Table.Td>
                      <Text
                        size="sm"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        {animation ? (
                          <IconCheck size={16} color="green" />
                        ) : (
                          <IconAlertTriangle size={16} color="orange" />
                        )}
                        {name}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      {animation ? (
                        <TileAnimation
                          frames={animation.frames}
                          scale={2}
                          bounded
                        />
                      ) : (
                        <Anchor
                          underline="hover"
                          size="xs"
                          onClick={activateAnimationTool}
                        >
                          Create
                        </Anchor>
                      )}
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>

          <Button
            variant="filled"
            fullWidth
            mt="md"
            disabled={!hasAll}
            onClick={openSaveModal}
          >
            Create NPC
          </Button>
        </Stack>
      </Fieldset>

      <Modal
        centered={true}
        opened={saveModalOpened}
        onClose={closeSaveModal}
        title="Save NPC"
        overlayProps={overlayProps}
      >
        <form onSubmit={formSubmit}>
          <Stack p={0}>
            <TileAnimation frames={previewFrames} scale={8} bounded />
            <TextInput
              label="Name"
              description="What should we call this NPC? You can change it later."
              placeholder="MyNPC"
              {...form.getInputProps("name")}
            />
            <TagsInput
              label="Tags"
              description="Tags are used to find NPCs in the object palette."
              placeholder="Enemy"
              splitChars={[",", " ", "|"]}
              limit={5}
              data={[
                {
                  group: "Required for NPCs",
                  items: [...requiredNpcAnimations],
                },
              ]}
              renderOption={(item) => {
                const label = item.option.value;
                return (
                  <Group gap="xs" wrap="nowrap">
                    <span>{label}</span>
                  </Group>
                );
              }}
              {...form.getInputProps("names")}
            />
            <Group mt="lg" justify="flex-end">
              <Button color="blue" type="submit">
                Save
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  );
}
