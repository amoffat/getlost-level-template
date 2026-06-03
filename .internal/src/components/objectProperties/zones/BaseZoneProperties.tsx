import { useAppDispatch } from "@/hooks/redux";
import { actions as mapEditorActions } from "@/slices/mapEditor";
import { setToolThunk } from "@/thunks/map";
import { ZoneType } from "@/types/zone";
import { Button, Fieldset, Slider, Stack } from "@mantine/core";
import { IconBrush } from "@tabler/icons-react";
import { ReactElement, useCallback } from "react";
import { useTranslation } from "react-i18next";
import PropertyValue, {
  PropertyValueInfo,
  PropertyValueScope,
} from "../../PropertyValue";
import IdInput from "../inputs/IdInput";
import SwitchInput from "../inputs/SwitchInput";

type CommonZoneInterface = {
  id: string;
  enabled: boolean;
  padding?: number;
};

type BaseZoneProps<T extends CommonZoneInterface> = {
  objs: T[];
  legend?: React.ReactNode | string;
  zoneType: ZoneType;
  updateObjs: (changes: Partial<T>) => void;
  children?: React.ReactNode;
};

export default function BaseZoneProperties<T extends CommonZoneInterface>({
  objs,
  legend,
  zoneType,
  updateObjs,
  children,
}: BaseZoneProps<T>) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  let idInput;
  if (objs.length === 1) {
    idInput = <IdInput id={objs[0].id} />;
  }

  const enabledValues: PropertyValueInfo<boolean>[] = objs.map((o) => ({
    key: o.id,
    value: o.enabled,
    scope: "instance",
  }));

  const enabledInput = (
    <SwitchInput
      label={t("zoneEnabledLabel")}
      description={t("zoneEnabledDescription")}
      noTemplate
      values={enabledValues}
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

  const paddingValues: PropertyValueInfo<number>[] = objs.map((o) => ({
    key: o.id,
    value: o.padding ?? 0,
    scope: "instance",
  }));

  const zonesWithPadding = objs.every((obj) => obj.padding !== undefined);

  const paddingInput = (
    <PropertyValue
      label={t("cameraZonePropPaddingLabel")}
      noTemplate
      values={paddingValues}
      defaultValue={0}
      // debounceMs={100}
      onValueChange={({
        value,
      }: {
        scope: PropertyValueScope;
        value: number | undefined;
      }) => {
        updateObjs({ padding: value } as Partial<T>);
      }}
      renderInput={({ key, defaultValue: value, onChange }): ReactElement => (
        <Slider
          key={key}
          defaultValue={value}
          min={0}
          max={100}
          step={1}
          onChange={onChange}
        />
      )}
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
        {zonesWithPadding && paddingInput}

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
