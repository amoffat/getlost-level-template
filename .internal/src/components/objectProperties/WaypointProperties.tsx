import { waypointIcon } from "@/constants/tsObjs";
import { useAppSelector } from "@/hooks/redux";
import { selectors as mapSelectors } from "@/slices/mapEditor";
import { collectPropertyValues } from "@/store/selectors";
import { WaypointObj } from "@/types/map";
import { WaypointProps } from "@/types/properties";
import { updateObjectProperties } from "@/utils/propertyEditor";
import { createPropsEqualFn } from "@/utils/propertyKey";
import { Fieldset, Stack } from "@mantine/core";
import { memo, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { PropertyValueScope } from "../PropertyValue";
import SlugInput from "./inputs/SlugInput";
import { requiredUniqueName } from "./validators/name";

const COLLECTED_PROPS = ["slug"] as const;
const TEMPLATE_PROPS = ["id"] as const;
const RELEVANT_PROPS = [...TEMPLATE_PROPS, ...COLLECTED_PROPS] as const;

function WaypointProperties({ objs }: { objs: WaypointObj[] }) {
  const { t } = useTranslation();

  const objsByTemplateId = useAppSelector((state) =>
    mapSelectors.objectsByTemplateId(state, waypointIcon),
  ) as WaypointObj[];

  const updateProps = useCallback(
    (scope: PropertyValueScope, props: Partial<WaypointProps>) => {
      updateObjectProperties({
        scope,
        objs,
        props,
        // Waypoints have no shared global template — all properties are per-instance.
        templateUpdate: () => {},
      });
    },
    [objs],
  );

  const toCollect = useAppSelector((state) =>
    collectPropertyValues(state, objs, [...COLLECTED_PROPS]),
  );

  const existingSlugs = useMemo(() => {
    const slugs = new Set<string>();
    const skipIds = new Set(objs.map((obj) => obj.id));
    objsByTemplateId.forEach((obj) => {
      if (skipIds.has(obj.id)) return;
      if (!obj.slug) return;
      slugs.add(obj.slug);
    });
    return slugs;
  }, [objsByTemplateId, objs]);

  const slugValidator = useCallback(
    (value: string | undefined) => {
      return requiredUniqueName(existingSlugs, value);
    },
    [existingSlugs],
  );

  const singleSelected = objs.length === 1;

  return (
    <Fieldset legend={t("waypointPropLegend")} p="xs">
      <Stack p={0} gap="xl">
        {singleSelected && (
          <SlugInput
            description={t("waypointPropSlugDescription")}
            noTemplate
            values={toCollect.slug}
            validator={slugValidator}
            onValueChange={({ scope, value }): void => {
              updateProps(scope, {
                slug: value ?? null,
                status: slugValidator(value ?? undefined) ? "error" : null,
              });
            }}
            required
          />
        )}
      </Stack>
    </Fieldset>
  );
}

export default memo(
  WaypointProperties,
  createPropsEqualFn<WaypointObj>(RELEVANT_PROPS),
);
