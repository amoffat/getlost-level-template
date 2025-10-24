import { useAppSelector } from "@/hooks/redux";
import { Button, Fieldset, Group, Stack, Text } from "@mantine/core";
import TilesetGroup from "../TilesetGroup";
import Tip from "../Tip";

export default function TileAnimationOptions() {
  const cands = useAppSelector(
    (state) => state.mapEditor.toolOptions["magic-paint"].candidates
  );

  const createAnimation = () => {};

  return (
    <>
      <Tip
        tips={[
          "Select tiles that you want to see in your animation.",
          "You may only select objects that are the same size.",
        ]}
      />
      <Fieldset legend="Animation frames" p="xs">
        <Stack p={0} gap="sm">
          <Text size="xs" c="dimmed">
            Selected frames will appear below:
          </Text>
          {cands.map((cand, idx) => {
            const displayNumber = idx + 1; // 1-based label
            return (
              <Group key={cand.id} align="center" gap="sm" wrap="nowrap">
                <TilesetGroup group={cand} scale={3} />
              </Group>
            );
          })}

          <Button variant="filled" fullWidth onClick={createAnimation}>
            Create animation
          </Button>
        </Stack>
      </Fieldset>
    </>
  );
}
