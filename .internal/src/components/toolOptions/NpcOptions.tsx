import { requiredNpcAnimations } from "@/constants";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { actions as uiActions } from "@/slices/ui";
import { setToolThunk } from "@/thunks/tileset";
import { isObjectAnimation } from "@/types/tilegroup";
import { Anchor, Button, Fieldset, Stack, Table, Text } from "@mantine/core";
import { IconAlertTriangle, IconCheck } from "@tabler/icons-react";
import { ReactNode, useEffect, useMemo } from "react";
import TileAnimation from "../TileAnimation";
import Tip from "../Tip";

export default function NpcOptions() {
  const tsId = useAppSelector((state) => state.tilesetEditor.activeTilesetId)!;
  const ts = useAppSelector((state) => state.tilesetEditor.tilesets[tsId]);
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(uiActions.setTilesetTab("animations"));
  }, [dispatch]);

  // Extract all animations from the active tileset
  const allAnimations = useMemo(() => {
    return Object.values(ts.tiles.entities).filter(isObjectAnimation);
  }, [ts]);

  // Match each NPC animation name with animations from the tileset
  const animationMatches = useMemo(() => {
    return requiredNpcAnimations.map((requiredName) => {
      const match = allAnimations.find((anim) =>
        anim.names.includes(requiredName)
      );
      return {
        name: requiredName,
        animation: match ?? null,
      };
    });
  }, [allAnimations]);

  const [hasAll, hasSome, hasNone] = useMemo(() => {
    let hasAll = true;
    let hasSome = false;
    let hasNone = true;
    for (const match of animationMatches) {
      if (match.animation === null) {
        if (hasAll) {
          hasAll = false;
        }
      } else {
        hasSome = true;
        hasNone = false;
      }
    }
    return [hasAll, hasSome, hasNone];
  }, [animationMatches]);

  const tips: ReactNode[] = useMemo(() => {
    const activateAnimationTool = () => {
      dispatch(setToolThunk("animate"));
    };
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
  }, [dispatch, hasAll, hasSome, hasNone]);

  const handlePickAnimation = (animationName: string) => {
    // TODO: Implement animation picker
    console.log("Pick animation for:", animationName);
  };

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
              {animationMatches.map(({ name, animation }) => (
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
                    {animation && (
                      <TileAnimation
                        frames={animation.frames}
                        scale={2}
                        bounded
                      />
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>

          <Button variant="filled" fullWidth mt="md" disabled={!hasAll}>
            Create NPC
          </Button>
        </Stack>
      </Fieldset>
    </>
  );
}
