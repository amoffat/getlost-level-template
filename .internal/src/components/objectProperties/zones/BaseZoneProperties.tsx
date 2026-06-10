import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { actions as mapEditorActions } from "@/slices/mapEditor";
import { collectPropertyValues } from "@/store/selectors";
import { setToolThunk } from "@/thunks/map";
import { BaseZoneObj } from "@/types/map";
import { ZoneType } from "@/types/zone";
import { Button, Fieldset, Stack } from "@mantine/core";
import { IconBrush } from "@tabler/icons-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { PropertyValueScope } from "../../PropertyValue";
import IdInput from "../inputs/IdInput";
import SwitchInput from "../inputs/SwitchInput";

const COLLECTED_PROPS = ["id", "enabled"] as const;

type BaseZoneProps<T extends BaseZoneObj> = {
  objs: T[];
  legend?: React.ReactNode | string;
  zoneType: ZoneType;
  updateObjs: (changes: Partial<T>) => void;
  children?: React.ReactNode;
};

export default function BaseZoneProperties<T extends BaseZoneObj>({
  objs,
  legend,
  zoneType,
  updateObjs,
  children,
}: BaseZoneProps<T>) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const toCollect = useAppSelector((state) =>
    collectPropertyValues(state, objs, [...COLLECTED_PROPS]),
  );

  const idInput = <IdInput values={toCollect.id} />;

  const enabledInput = (
    <SwitchInput
      label={t("zoneEnabledLabel")}
      description={t("zoneEnabledDescription")}
      noTemplate
      values={toCollect.enabled}
      onValueChange={({
        value,
      }: {
        scope: PropertyValueScope;
        value: boolean | undefined;
      }) => {
        updateObjs({ enabled: value } as Partial<T>);
      }}
    />
  );

  const onEditClick = useCallback(() => {
    dispatch(
      mapEditorActions.setToolOptions({
        tool: "paint-zone",
        options: { zoneType },
      }),
    );
    dispatch(setToolThunk("paint-zone"));
  }, [dispatch, zoneType]);

  return (
    <Fieldset legend={legend} p="xs">
      <Stack p={0} gap="xl">
        {idInput}
        {enabledInput}
        {children}
        <Button
          leftSection={<IconBrush size={16} />}
          fullWidth
          onClick={onEditClick}
        >
          {t("zonePropEditLabel")}
        </Button>
      </Stack>
    </Fieldset>
  );
}
