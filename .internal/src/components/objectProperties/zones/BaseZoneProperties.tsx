import { useAppDispatch } from "@/hooks/redux";
import { actions as mapEditorActions } from "@/slices/mapEditor";
import { setToolThunk } from "@/thunks/map";
import { ZoneType } from "@/types/zone";
import { Button, Fieldset, Slider, Stack, TextInput } from "@mantine/core";
import { IconBrush } from "@tabler/icons-react";
import { ChangeEvent, ReactElement, useCallback } from "react";
import { useTranslation } from "react-i18next";
import PropertyValue, {
  PropertyValueInfo,
  PropertyValueScope,
} from "../../PropertyValue";

type CommonZoneInterface = {
  id: string;
  name?: string;
  padding?: number;
};

type BaseZoneProps<T extends CommonZoneInterface> = {
  objs: T[];
  legend?: React.ReactNode | string;
  zoneType: ZoneType;
  nameLabel?: string;
  namePlaceholder?: string;
  nameDescription?: string;
  updateObjs: (changes: Partial<T>) => void;
  children?: React.ReactNode;
};

export default function BaseZoneProperties<T extends CommonZoneInterface>({
  objs,
  legend,
  zoneType,
  nameLabel,
  namePlaceholder,
  nameDescription,
  updateObjs,
  children,
}: BaseZoneProps<T>) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const nameValues: PropertyValueInfo<string>[] = objs.map((o) => ({
    key: o.id,
    value: (o as any).name ?? "",
    scope: "instance",
  }));

  const nameInput = (
    <PropertyValue
      label={nameLabel ?? t("zonePropNameLabel")}
      description={nameDescription ?? t("zonePropNameDescription")}
      noTemplate
      values={nameValues}
      defaultValue=""
      debounceMs={100}
      onValueChange={({
        value,
      }: {
        scope: PropertyValueScope;
        value: string | undefined;
      }) => {
        updateObjs({ name: value ?? "" } as Partial<T>);
      }}
      renderInput={({ key, defaultValue: value, onChange }): ReactElement => (
        <TextInput
          key={key}
          defaultValue={value ?? ""}
          placeholder={namePlaceholder ?? t("zonePropNamePlaceholder")}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onChange(e.target.value)
          }
        />
      )}
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
      label={t("zoomZonePropPaddingLabel")}
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
        {nameInput}
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
