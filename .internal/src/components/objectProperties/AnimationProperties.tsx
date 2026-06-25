import { useCollectPropertyValues } from "@/hooks/useCollectPropertyValues";
import { AnimationInstance } from "@/types/map";
import { AnimationProps } from "@/types/properties";
import {
  updateObjectOrTemplate,
  updateTilesetTemplates,
} from "@/utils/propertyEditor";
import { createPropsEqualFn } from "@/utils/propertyKey";
import { Fieldset, Stack } from "@mantine/core";
import { memo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import AdvancedSection from "../common/AdvancedSection";
import { PropertyValueScope } from "../PropertyValue";
import FlipXInput from "./inputs/FlipXInput";
import GroundOffsetInput from "./inputs/GroundOffsetInput";
import HiddenInput from "./inputs/HiddenInput";
import IdInput from "./inputs/IdInput";
import SwitchInput from "./inputs/SwitchInput";
import TintInput from "./inputs/TintInput";

// Properties that collectPropertyValues needs to access
const COLLECTED_PROPS = [
  "id",
  "tags",
  "talkable",
  "flipX",
  "tint",
  "autoplay",
  "loop",
  "hidden",
  "groundOffset",
] as const;

// Additional properties needed for template resolution
const TEMPLATE_PROPS = ["tsObjId", "tilesetId"] as const;

// All properties relevant for memo comparison
const RELEVANT_PROPS: readonly (keyof AnimationInstance)[] = [
  ...TEMPLATE_PROPS,
  ...COLLECTED_PROPS,
];

function AnimationProperties({ objs }: { objs: AnimationInstance[] }) {
  const toCollect = useCollectPropertyValues(objs, COLLECTED_PROPS);
  const { t } = useTranslation();

  const updateProps = useCallback(
    (scope: PropertyValueScope, props: Partial<AnimationProps>) => {
      updateObjectOrTemplate({
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
      onValueChange={({ scope, value }) => updateProps(scope, { flipX: value })}
    />
  );

  const talkableInput = (
    <SwitchInput
      label={t("talkableLabel")}
      noTemplate
      description={t("talkableDescription")}
      values={toCollect.talkable}
      onValueChange={({ scope, value }) =>
        updateProps(scope, { talkable: value })
      }
    />
  );

  const tintInput = (
    <TintInput
      description="A color tint to apply to this animation."
      values={toCollect.tint}
      onValueChange={({ scope, value }) => updateProps(scope, { tint: value })}
    />
  );

  const autoplayInput = (
    <SwitchInput
      label="Autoplay"
      description="Start the animation immediately"
      values={toCollect.autoplay}
      onValueChange={({ scope, value }) =>
        updateProps(scope, { autoplay: value })
      }
    />
  );

  const loopInput = (
    <SwitchInput
      label="Loop"
      description="Whether this animation loops continuously."
      values={toCollect.loop}
      onValueChange={({ scope, value }) => updateProps(scope, { loop: value })}
    />
  );

  const hiddenInput = (
    <HiddenInput
      description="Whether this animation starts off hidden on the map."
      values={toCollect.hidden}
      onValueChange={({ scope, value }) =>
        updateProps(scope, { hidden: value })
      }
    />
  );

  const groundOffsetInput = (
    <GroundOffsetInput
      description="Vertical offset of the animation from the ground."
      values={toCollect.groundOffset}
      onValueChange={({ scope, value }) =>
        updateProps(scope, { groundOffset: value })
      }
    />
  );

  const idInput = <IdInput values={toCollect.id} />;

  return (
    <Fieldset legend="Animation properties" p="xs">
      <Stack p={0} gap="xl">
        {flipXInput}
        {talkableInput}
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
