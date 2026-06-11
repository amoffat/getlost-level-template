import { entryTemplateId } from "@/constants";
import { useAppSelector } from "@/hooks/redux";
import { selectors as mapSelectors } from "@/slices/mapEditor";
import { collectPropertyValues } from "@/store/selectors";
import { EntranceObj } from "@/types/map";
import { updateObjects } from "@/utils/propertyEditor";
import { createPropsEqualFn } from "@/utils/propertyKey";
import {
  Button,
  CloseButton,
  Fieldset,
  Group,
  Stack,
  TextInput,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { memo, ReactElement, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import GatewayModal from "../GatewayModal";
import PropertyValue from "../PropertyValue";
import SlugInput from "./inputs/SlugInput";
import { requiredUniqueName } from "./validators/name";

// Properties that collectPropertyValues needs to access
const COLLECTED_PROPS = ["id", "slug", "exitIds"] as const;

// Additional properties needed for identification
const TEMPLATE_PROPS = [] as const;

// All properties relevant for memo comparison
const RELEVANT_PROPS = [...TEMPLATE_PROPS, ...COLLECTED_PROPS] as const;

function EntranceProperties({ objs }: { objs: EntranceObj[] }) {
  const { t } = useTranslation();
  const [modalOpened, { open: openModal, close: closeModal }] =
    useDisclosure(false);
  const objsByTemplateId = useAppSelector((state) =>
    mapSelectors.objectsByTemplateId(state, entryTemplateId),
  ) as EntranceObj[];

  const toCollect = useAppSelector((state) =>
    collectPropertyValues(state, objs, [...COLLECTED_PROPS]),
  );

  const handleModalSubmit = useCallback(
    (gatewayId: string, numericRepoId: string | null) => {
      // Update the exit id with the format: repoId/exitId
      const formattedExitId = numericRepoId
        ? `${numericRepoId}/${gatewayId}`
        : gatewayId;

      // Add the new exit ID to the array
      const currentExitIds = toCollect.exitIds[0]?.value ?? [];
      const newExitIds = [...currentExitIds, formattedExitId];
      updateObjects({ objs, changes: { exitIds: newExitIds } });
    },
    [toCollect.exitIds, objs],
  );

  const filterGateway = useCallback(
    (repoId: string, gatewayId: string) => {
      const currentExitIds = toCollect.exitIds[0]?.value ?? [];
      const formattedExitId = `${repoId}/${gatewayId}`;
      // Return true to include, false to filter out
      return !currentExitIds.includes(formattedExitId);
    },
    [toCollect.exitIds],
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

  const slugInput = (
    <SlugInput
      description={t("entrancePropNameDescription")}
      noTemplate
      values={toCollect.slug}
      validator={slugValidator}
      onValueChange={({ value }): void => {
        updateObjects({
          objs,
          changes: {
            slug: value ?? null,
            status: slugValidator(value ?? undefined) ? "error" : null,
          },
        });
      }}
      required
    />
  );

  const numExits = toCollect.exitIds[0]?.value.length ?? 0;

  const exitIdInput = (
    <Stack p={0} gap="xs">
      <PropertyValue
        label={t("entrancePropExitConnectionsLabel")}
        description={t("entrancePropExitConnectionsDescription")}
        noTemplate
        values={toCollect.exitIds}
        onValueChange={({ value }: { value: string[] | undefined }): void => {
          updateObjects({ objs, changes: { exitIds: value } });
        }}
        renderInput={({ key, defaultValue: value, onChange }): ReactElement => {
          const exitIds = value ?? [];

          return (
            <Stack key={key} gap="xs" p={0}>
              {exitIds.map((exitId, index) => (
                <Group key={index} gap="xs" wrap="nowrap">
                  <TextInput
                    flex={1}
                    value={exitId}
                    placeholder={t("entrancePropExitIdPlaceholder")}
                    onChange={(e) => {
                      const newExitIds = [...exitIds];
                      newExitIds[index] = e.target.value;
                      onChange(newExitIds);
                    }}
                  />
                  <CloseButton
                    size="xs"
                    onClick={() => {
                      const newExitIds = exitIds.filter((_, i) => i !== index);
                      onChange(newExitIds);
                    }}
                  />
                </Group>
              ))}
            </Stack>
          );
        }}
      />
      {numExits < 3 && (
        <Button size="xs" fullWidth onClick={openModal}>
          {t("entrancePropAddConnection")}
        </Button>
      )}
    </Stack>
  );

  const singleSelected = objs.length === 1;

  return (
    <>
      <Fieldset legend={t("entrancePropLegend")} p="xs">
        <Stack p={0} gap="xl">
          {singleSelected && slugInput}
          {singleSelected && exitIdInput}
        </Stack>
      </Fieldset>

      <GatewayModal
        opened={modalOpened}
        onClose={closeModal}
        onSubmit={handleModalSubmit}
        gatewayLabel={t("entrancePropGatewayLabel")}
        gatewayPlaceholder={t("entrancePropGatewayPlaceholder")}
        gatewayDescription={t("entrancePropGatewayDescription")}
        filterGateway={filterGateway}
      />
    </>
  );
}

export default memo(
  EntranceProperties,
  createPropsEqualFn<EntranceObj>(RELEVANT_PROPS),
);
