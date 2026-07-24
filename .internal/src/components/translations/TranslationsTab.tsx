import { defaultLocale } from "@/constants";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { selectors as localeSelectors } from "@/slices/locale";
import { loadDialogueLocaleThunk } from "@/thunks/locale";
import type { LocaleEntry } from "@/types/locale";
import { syncLocaleField } from "@/utils/locale";
import {
  Box,
  Group,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
import {
  IconAlertTriangleFilled,
  IconCircleCheckFilled,
  IconLanguage,
  IconSearch,
} from "@tabler/icons-react";
import { DataTable, type DataTableColumn } from "mantine-datatable";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

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
 * An unstyled, autosizing textarea cell that owns its own debounce, so edits to
 * different rows never collapse into one another.
 */
function EditableCell({
  initialValue,
  onSave,
  placeholder,
}: {
  initialValue: string;
  onSave: (value: string) => void;
  placeholder?: string;
}) {
  const save = useDebouncedCallback(onSave, 300);
  return (
    <Textarea
      defaultValue={initialValue}
      autosize
      minRows={1}
      maxRows={6}
      size="xs"
      variant="unstyled"
      placeholder={placeholder}
      onChange={(ev) => save(ev.currentTarget.value)}
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

  // Re-sync this locale from disk whenever the tab's locale changes, so the
  // grid reflects the on-disk file even if edited elsewhere.
  useEffect(() => {
    dispatch(loadDialogueLocaleThunk(activeLocale));
  }, [dispatch, activeLocale]);

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

  const columns = useMemo(() => {
    const cols: DataTableColumn<LocaleEntry>[] = [
      {
        accessor: "id",
        title: t("translationsKeyCol"),
        width: 130,
        resizable: true,
        ellipsis: true,
        render: (e) => (
          <Text ff="monospace" fz="10px" c="dimmed" title={e.id}>
            {e.id}
          </Text>
        ),
      },
      {
        accessor: "v",
        title: t("translationsTextCol"),
        resizable: true,
        render: (e) => (
          <EditableCell
            key={`${e.id}:${activeLocale}`}
            initialValue={e.v}
            onSave={(value) => saveText(e, value)}
          />
        ),
      },
      {
        accessor: "original",
        title: t("translationsOriginalCol"),
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
        width: 200,
        resizable: true,
        render: (e) =>
          isMain ? (
            <EditableCell
              key={`${e.id}:ctx`}
              initialValue={e.ctx ?? ""}
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
            size={16}
            title={t("translationsStatusCol")}
            style={{ color: "var(--mantine-color-dimmed)", display: "block" }}
          />
        ),
        width: 44,
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
  }, [t, isMain, activeLocale, saveText, saveCtx, statusById]);

  return (
    <Stack gap="xs" p="sm" h="calc(100vh - 60px)">
      <Group justify="space-between">
        <TextInput
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          placeholder={t("translationsSearchPlaceholder")}
          leftSection={<IconSearch size={14} />}
          w={320}
        />
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
          storeColumnsKey="translations-table"
          striped
          highlightOnHover
          idAccessor="id"
          records={filtered}
          columns={columns}
          noRecordsText={t("translationsEmpty")}
          styles={{ table: { width: "100%" } }}
        />
      </Box>
    </Stack>
  );
}
