import { AnimationInstance } from "@/types/map";
import { AnimationProps } from "@/types/properties";
import {
  collectPropertyValues,
  updateObjectProperties,
  updateTilesetTemplates,
} from "@/utils/propertyEditor";
import { createPropertyKey, createPropsEqualFn } from "@/utils/propertyKey";
import {
  ActionIcon,
  Box,
  Fieldset,
  Group,
  Stack,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { IconCopy } from "@tabler/icons-react";
import { memo, useCallback, useMemo } from "react";
import AdvancedSection from "../common/AdvancedSection";
import { PropertyValueScope } from "../PropertyValue";
import FlipXInput from "./inputs/FlipXInput";
import GroundOffsetInput from "./inputs/GroundOffsetInput";
import HiddenInput from "./inputs/HiddenInput";
import SwitchInput from "./inputs/SwitchInput";
import TintInput from "./inputs/TintInput";

// Properties that collectPropertyValues needs to access
const COLLECTED_PROPS = [
  "tags",
  "flipX",
  "tint",
  "autoplay",
  "loop",
  "hidden",
  "groundOffset",
] as const;

// Additional properties needed for template resolution
const TEMPLATE_PROPS = ["id", "tsObjId", "tilesetId"] as const;

// All properties relevant for memo comparison
const RELEVANT_PROPS: readonly (keyof AnimationInstance)[] = [
  ...TEMPLATE_PROPS,
  ...COLLECTED_PROPS,
];

function AnimationProperties({ objs }: { objs: AnimationInstance[] }) {
  // Create a key based only on relevant properties
  const propertyKey = createPropertyKey(objs, RELEVANT_PROPS);

  const toCollect = useMemo(() => {
    return collectPropertyValues(objs, [...COLLECTED_PROPS]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyKey]);

  const updateProps = useCallback(
    (scope: PropertyValueScope, props: Partial<AnimationProps>) => {
      updateObjectProperties({
        scope,
        objs,
        props,
        templateUpdate: updateTilesetTemplates,
      });
    },
    [objs],
  );

  const flipXInput = (
    <FlipXInput
      values={toCollect.flipX}
      onValueChange={(scope, value) => updateProps(scope, { flipX: value })}
    />
  );

  const tintInput = (
    <TintInput
      description="A color tint to apply to this animation."
      values={toCollect.tint}
      onValueChange={(scope, value) => updateProps(scope, { tint: value })}
    />
  );

  const autoplayInput = (
    <SwitchInput
      label="Autoplay"
      description="Start the animation immediately"
      values={toCollect.autoplay}
      onValueChange={(scope, value) => updateProps(scope, { autoplay: value })}
    />
  );

  const loopInput = (
    <SwitchInput
      label="Loop"
      description="Whether this animation loops continuously."
      values={toCollect.loop}
      onValueChange={(scope, value) => updateProps(scope, { loop: value })}
    />
  );

  const hiddenInput = (
    <HiddenInput
      description="Whether this animation starts off hidden on the map."
      values={toCollect.hidden}
      onValueChange={(scope, value) => updateProps(scope, { hidden: value })}
    />
  );

  const groundOffsetInput = (
    <GroundOffsetInput
      description="Vertical offset of the animation from the ground."
      values={toCollect.groundOffset}
      onValueChange={(scope, value) =>
        updateProps(scope, { groundOffset: value })
      }
    />
  );

  let idInput;
  if (objs.length === 1) {
    const copyId = () => {
      navigator.clipboard.writeText(objs[0].id);
    };

    idInput = (
      <Group gap="xs" wrap="nowrap">
        <Box style={{ flex: 1 }}>
          <TextInput
            label="ID"
            description="The object's unique identifier."
            value={objs[0].id}
            disabled
          />
        </Box>
        <Tooltip label="Copy id">
          <ActionIcon onClick={copyId} variant="subtle" color="gray" size="sm">
            <IconCopy size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>
    );
  }

  return (
    <Fieldset legend="Animation properties" p="xs">
      <Stack p={0} gap="xl">
        {flipXInput}
        {tintInput}
        {autoplayInput}
        {loopInput}
        {hiddenInput}
        {groundOffsetInput}
        <AdvancedSection>{idInput}</AdvancedSection>
      </Stack>
    </Fieldset>
  );
}

export default memo(
  AnimationProperties,
  createPropsEqualFn<AnimationInstance>(RELEVANT_PROPS),
);
