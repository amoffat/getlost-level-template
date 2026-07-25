import { defaultLocale } from "@/constants";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import {
  actions as localeActions,
  selectors as localeSelectors,
} from "@/slices/locale";
import {
  deleteLocaleEntriesThunk,
  loadDialogueLocaleThunk,
  setEntriesPinThunk,
} from "@/thunks/locale";
import type { LocaleEntry } from "@/types/locale";
import { copyToClipboard } from "@/utils/copy";
import {
  computeSourceHash,
  newLocaleId,
  syncLocaleField,
} from "@/utils/locale";
import {
  Box,
  Button,
  Checkbox,
  type CheckboxProps,
  Group,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { useDebouncedCallback, useDisclosure } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import {
  IconAlertTriangleFilled,
  IconCircleCheckFilled,
  IconLanguage,
  IconPin,
  IconPlus,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react";
import { DataTable, type DataTableColumn } from "mantine-datatable";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import AddEntryModal from "./AddEntryModal";

interface RowStatus {
  untranslated: boolean;
  outOfDate: boolean;
  needsAttention: boolean;
}

const OK_STATUS: RowStatus = {
  untranslated: false,
  outOfDate: false,
  needsAttention: false,
};

/**
 * Renders the pin glyph as a Checkbox's checked indicator, so a pinned row
 * shows a filled (yellow) pin instead of the default checkmark.
 */
const PinCheckIcon: CheckboxProps["icon"] = ({ className }) => (
  <IconPin className={className} />
);

/**
 * An unstyled, autosizing textarea cell that owns its own debounce, so edits to
 * different rows never collapse into one another.
 *
 * It is controlled so it can reflect out-of-band changes to the underlying
 * value — e.g. an entry created/edited in the Dialogue tab while this (still
 * mounted) tab is in the background. We resync from `value` only while the
 * field is NOT focused, so a background update never clobbers active typing.
 */
function EditableCell({
  value: externalValue,
  onSave,
  placeholder,
}: {
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
}) {
  const save = useDebouncedCallback(onSave, 300);
  const [value, setValue] = useState(externalValue);
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) setValue(externalValue);
  }, [externalValue]);

  return (
    <Textarea
      value={value}
      autosize
      minRows={1}
      maxRows={6}
      size="xs"
      variant="unstyled"
      placeholder={placeholder}
      onFocus={() => {
        focusedRef.current = true;
      }}
      onBlur={() => {
        focusedRef.current = false;
      }}
      onChange={(ev) => {
        setValue(ev.currentTarget.value);
        save(ev.currentTarget.value);
      }}
      styles={{ input: { padding: 0 } }}
    />
  );
}

/**
 * Spreadsheet-style editor for a single locale's level strings, synced from the
 * `level/locales/<locale>/dialogue.jsonl` files via the locale Redux slice.
 *
 * The displayed locale follows the shell header's "Level language" selector
 * (`activeLocale`). Edits dispatch through `syncLocaleField`, which preserves
 * each entry's stable `id`; the locale autosave middleware persists them.
 */
export default function TranslationsTab() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const activeLocale = useAppSelector(localeSelectors.activeLocale);
  const isMain = activeLocale === defaultLocale;

  const entries = useAppSelector(localeSelectors.selectActiveEntries);
  const mainEntries = useAppSelector(localeSelectors.selectDefaultEntries);

  const [query, setQuery] = useState("");
  const [onlyNeedsAttention, setOnlyNeedsAttention] = useState(false);
  const [selectedRecords, setSelectedRecords] = useState<LocaleEntry[]>([]);
  const [addOpen, { open: openAdd, close: closeAdd }] = useDisclosure(false);

  // Re-sync this locale from disk whenever the tab's locale changes, so the
  // grid reflects the on-disk file even if edited elsewhere.
  useEffect(() => {
    dispatch(loadDialogueLocaleThunk(activeLocale));
  }, [dispatch, activeLocale]);

  // A selection belongs to one locale, so drop it when the locale changes.
  // Adjusting state during render (rather than in an effect) is the pattern
  // React recommends for resetting state in response to a prop/value change.
  const [selectionLocale, setSelectionLocale] = useState(activeLocale);
  if (selectionLocale !== activeLocale) {
    setSelectionLocale(activeLocale);
    setSelectedRecords([]);
  }

  const rows = useMemo(
    () => Object.values(entries).filter((e): e is LocaleEntry => !!e),
    [entries],
  );

  // Per-row translation status (only meaningful for non-main locales).
  const statusById = useMemo(() => {
    const map: Record<string, RowStatus> = {};
    for (const e of rows) {
      if (isMain) {
        map[e.id] = OK_STATUS;
        continue;
      }
      const main = mainEntries[e.id];
      const untranslated = e.original !== undefined && e.v === e.original;
      const outOfDate =
        e.hash !== undefined &&
        main?.hash !== undefined &&
        e.hash !== main.hash;
      map[e.id] = {
        untranslated,
        outOfDate,
        needsAttention: untranslated || outOfDate,
      };
    }
    return map;
  }, [rows, isMain, mainEntries]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((e) => {
      if (onlyNeedsAttention && !statusById[e.id]?.needsAttention) return false;
      if (!q) return true;
      return (
        e.id.toLowerCase().includes(q) ||
        e.v.toLowerCase().includes(q) ||
        (e.original ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, query, onlyNeedsAttention, statusById]);

  const saveText = useCallback(
    (entry: LocaleEntry, value: string) => {
      // A translation with no source counterpart cannot be resolved; skip it
      // rather than accidentally writing into the main locale.
      if (!isMain && !mainEntries[entry.id]) return;
      syncLocaleField({
        locale: activeLocale,
        prevEntry: entry,
        defaultEntry: isMain ? entry : mainEntries[entry.id],
        dispatch,
        updates: { v: value.trim() === "" ? null : value },
      });
    },
    [activeLocale, isMain, mainEntries, dispatch],
  );

  const saveCtx = useCallback(
    (entry: LocaleEntry, value: string) => {
      syncLocaleField({
        locale: activeLocale,
        prevEntry: entry,
        defaultEntry: entry,
        dispatch,
        updates: { ctx: value.trim() === "" ? null : value },
      });
    },
    [activeLocale, dispatch],
  );

  // Batch actions operate on the currently selected rows. Each is guarded by a
  // confirmation and clears the selection afterward.
  const confirmDeleteSelected = useCallback(() => {
    if (selectedRecords.length === 0) return;
    modals.openConfirmModal({
      title: t("translationsDeleteConfirmTitle", {
        count: selectedRecords.length,
      }),
      centered: true,
      children: <Text size="sm">{t("translationsDeleteConfirmBody")}</Text>,
      labels: { confirm: t("translationsDelete"), cancel: t("no") },
      confirmProps: { color: "red" },
      onConfirm: () => {
        // Delete everywhere (all locales) and clear any dangling references,
        // regardless of which locale is currently displayed.
        dispatch(deleteLocaleEntriesThunk(selectedRecords.map((e) => e.id)));
        setSelectedRecords([]);
      },
    });
  }, [t, dispatch, selectedRecords]);

  // Per-row pin toggle. Pinning is immediate; unpinning is guarded by a
  // confirmation, since it re-exposes the entry to auto-pruning. Pin lives on
  // the main entry, so writes always target it (via the thunk).
  const togglePin = useCallback(
    (entry: LocaleEntry, pinned: boolean) => {
      if (!pinned) {
        dispatch(setEntriesPinThunk({ ids: [entry.id], pin: true }));
        return;
      }
      modals.openConfirmModal({
        title: t("translationsUnpinConfirmTitle"),
        centered: true,
        children: <Text size="sm">{t("translationsUnpinConfirmBody")}</Text>,
        labels: { confirm: t("translationsUnpin"), cancel: t("no") },
        onConfirm: () =>
          dispatch(setEntriesPinThunk({ ids: [entry.id], pin: false })),
      });
    },
    [t, dispatch],
  );

  // Create a standalone, pinned entry on the main locale. It is attached to no
  // object, so `pin` keeps it from being auto-pruned. Autosave recomputes the
  // hash, but we seed it so the entry is immediately consistent.
  const onAddEntry = useCallback(
    (text: string, ctx: string | undefined) => {
      dispatch(
        localeActions.upsertEntry({
          locale: defaultLocale,
          entry: {
            id: newLocaleId(),
            v: text,
            ctx,
            pin: true,
            hash: computeSourceHash(text),
          },
        }),
      );
    },
    [dispatch],
  );

  const columns = useMemo(() => {
    const cols: DataTableColumn<LocaleEntry>[] = [
      {
        accessor: "pin",
        title: (
          <IconPin
            size={20}
            title={t("translationsPinColumn")}
            style={{ color: "var(--mantine-color-dimmed)", display: "block" }}
          />
        ),
        textAlign: "center",
        width: "1%",
        // Pin lives on the main entry, so read it from there to reflect and
        // toggle the pin on every locale.
        render: (e) => {
          const pinned = !!(isMain ? e.pin : mainEntries[e.id]?.pin);
          return (
            <Checkbox
              checked={pinned}
              color="yellow"
              icon={PinCheckIcon}
              aria-label={t("translationsPinColumn")}
              onChange={() => togglePin(e, pinned)}
            />
          );
        },
      },
      {
        accessor: "id",
        title: t("translationsKeyCol"),
        resizable: true,
        ellipsis: true,
        width: "5%",
        // Click the id to copy it; copyToClipboard shows the shared "copied"
        // notification used elsewhere in the app.
        render: (e) => (
          <Tooltip
            label={t("translationsCopyKeyTooltip")}
            withArrow
            openDelay={400}
          >
            <UnstyledButton
              onClick={() => copyToClipboard({ value: e.id, t })}
              style={{ display: "block", width: "100%", cursor: "pointer" }}
            >
              <Text size="xs" c="dimmed" truncate>
                {e.id}
              </Text>
            </UnstyledButton>
          </Tooltip>
        ),
      },
      {
        accessor: "v",
        title: t("translationsTextCol"),
        width: "30%",
        resizable: true,
        render: (e) => (
          <EditableCell
            key={`${e.id}:${activeLocale}`}
            value={e.v}
            onSave={(value) => saveText(e, value)}
          />
        ),
      },
      {
        accessor: "original",
        title: t("translationsOriginalCol"),
        width: "30%",
        resizable: true,
        // Match the editable "text" cell, which preserves newlines. In the main
        // (source) locale the original IS the text, so mirror it.
        render: (e) => (
          <Text size="xs" c="dimmed" style={{ whiteSpace: "pre-wrap" }}>
            {isMain ? e.v : e.original}
          </Text>
        ),
      },
      {
        accessor: "ctx",
        title: t("translationsContextCol"),
        width: "30%",
        resizable: true,
        render: (e) =>
          isMain ? (
            <EditableCell
              key={`${e.id}:ctx`}
              value={e.ctx ?? ""}
              placeholder={t("translationsContextPlaceholder")}
              onSave={(value) => saveCtx(e, value)}
            />
          ) : (
            <Text size="xs" c="dimmed" style={{ whiteSpace: "pre-wrap" }}>
              {e.ctx}
            </Text>
          ),
      },
      {
        accessor: "status",
        title: (
          <IconLanguage
            size={20}
            title={t("translationsStatusCol")}
            style={{ color: "var(--mantine-color-dimmed)", display: "block" }}
          />
        ),
        width: "1%",
        textAlign: "center",
        // The main (source) locale is translated by definition, so a main row
        // is never flagged (statusById returns an all-false status for it).
        render: (e) => {
          const s = statusById[e.id];
          if (!s?.needsAttention) {
            return (
              <Tooltip label={t("translationsTranslated")} withArrow>
                <IconCircleCheckFilled
                  size={18}
                  style={{ color: "var(--mantine-color-green-6)" }}
                />
              </Tooltip>
            );
          }
          return (
            <Tooltip
              label={
                s.outOfDate
                  ? t("translationsOutOfDate")
                  : t("translationsUntranslated")
              }
              withArrow
            >
              <IconAlertTriangleFilled
                size={18}
                style={{ color: "var(--mantine-color-orange-6)" }}
              />
            </Tooltip>
          );
        },
      },
    ];

    return cols;
  }, [
    t,
    isMain,
    activeLocale,
    saveText,
    saveCtx,
    statusById,
    mainEntries,
    togglePin,
  ]);

  return (
    <Stack gap="xs" p="sm" h="calc(100vh - 60px)">
      <Group justify="space-between">
        <Group gap="xs">
          <Button
            size="md"
            variant="light"
            leftSection={<IconPlus size={16} />}
            onClick={openAdd}
          >
            {t("translationsAddEntry")}
          </Button>
          <Button
            size="md"
            color="red"
            variant="light"
            leftSection={<IconTrash size={16} />}
            disabled={selectedRecords.length === 0}
            onClick={confirmDeleteSelected}
          >
            {t("translationsDelete")}
          </Button>
          <TextInput
            size="md"
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            placeholder={t("translationsSearchPlaceholder")}
            leftSection={<IconSearch size={14} />}
            w={320}
          />
        </Group>
        {!isMain && (
          <Switch
            checked={onlyNeedsAttention}
            onChange={(e) => setOnlyNeedsAttention(e.currentTarget.checked)}
            label={t("translationsOnlyNeedsAttention")}
          />
        )}
      </Group>

      <Box style={{ flex: 1, minHeight: 0 }}>
        <DataTable<LocaleEntry>
          height="100%"
          verticalAlign="top"
          withTableBorder
          withColumnBorders
          storeColumnsKey="translations-table-v16"
          idAccessor="id"
          records={filtered}
          columns={columns}
          selectedRecords={selectedRecords}
          onSelectedRecordsChange={setSelectedRecords}
          noRecordsText={t("translationsEmpty")}
          styles={{ table: { width: "100%" } }}
        />
      </Box>

      <AddEntryModal
        opened={addOpen}
        onClose={closeAdd}
        onSubmit={onAddEntry}
      />
    </Stack>
  );
}
