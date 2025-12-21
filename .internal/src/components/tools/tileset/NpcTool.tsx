import { requiredNpcAnimations } from "@/constants";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { actions, selectors } from "@/slices/tilesetEditor";
import { actions as uiActions } from "@/slices/ui";
import { setToolThunk } from "@/thunks/tileset";
import { isAnimationTemplate, type AnimationTemplate } from "@/types/animation";
import {
  isNpcTemplate,
  type NpcAnimationRecord,
  type NpcRequiredAnimation,
  type NpcTemplate,
} from "@/types/npc";
import { TemplateType } from "@/types/templates";
import {
  Anchor,
  Button,
  Fieldset,
  Stack,
  Table,
  Text,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconAlertTriangle, IconCheck } from "@tabler/icons-react";
import { ReactNode, useCallback, useMemo } from "react";
import TileAnimation from "../../TileAnimation";
import Tip from "../../Tip";

interface FormValues {
  name: string;
}

export default function NpcTool() {
  const ts = useAppSelector(selectors.activeTileset);
  const dispatch = useAppDispatch();

  const existingNpc = useMemo(() => {
    const npcs = ts?.tiles.ids
      .map((id) => ts?.tiles.entities[id])
      .filter(isNpcTemplate);
    return npcs?.at(0);
  }, [ts]);

  const form = useForm<FormValues>({
    name: "npc",
    // We have to use a controlled form, because otherwise some fields are very
    // difficult to update correctly.
    mode: "controlled",
    onSubmitPreventDefault: "always",
    initialValues: {
      name: existingNpc?.name ?? "npc",
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
    if (!ts) return {};

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

  const saveNpc = useCallback(
    (values: FormValues) => {
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
        gridSize: animations["Idle"].gridSize,
        name: "",
        tags: [],
        walkSpeed: 0.5,
        flipX: false,
        tint: null,
        hidden: false,
        groundOffset: 0,
        defaultAnimation: "Idle",
        dampenWalkCollisions: 0.5,
      };
      // Merge in existing properties of existing
      Object.assign(npc, existingNpc ?? {});
      // Set creation values
      Object.assign(npc, { name: values.name });

      dispatch(actions.setPaletteObjects({ tsId: ts!.id, objs: [npc] }));
      dispatch(uiActions.setTilesetTab("npcs"));

      notifications.show({
        title: "NPC saved",
        message: `Saved NPC "${values.name}".`,
        autoClose: 3000,
      });
    },
    [animationMatches, existingNpc, ts, dispatch]
  );

  const formSubmit = form.onSubmit(saveNpc);

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
        "Once every animation is assigned, enter a name and click 'Create NPC' to finalize."
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

    t.push("Only one NPC template can be created per tileset");
    return t;
  }, [activateAnimationTool, hasAll, hasSome, hasNone]);

  const canSave = hasAll;

  return (
    <>
      <Tip tips={tips} />
      <form onSubmit={formSubmit}>
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

            <TextInput
              label="Name"
              description="What should we call this NPC?"
              placeholder="Jeff"
              disabled={!canSave}
              {...form.getInputProps("name")}
            />

            <Button
              variant="filled"
              fullWidth
              mt="md"
              disabled={!canSave}
              type="submit"
            >
              {existingNpc ? "Update NPC" : "Create NPC"}
            </Button>
          </Stack>
        </Fieldset>
      </form>
    </>
  );
}
