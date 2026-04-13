import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { RootState } from "@/store/store";
import { makeLocaleKey, syncLocaleField } from "@/utils/locale";
import { Textarea, TextareaProps } from "@mantine/core";
import { useDebouncedCallback, useDisclosure } from "@mantine/hooks";
import LocaleContextModal from "./LocaleContextModal";
import LocalizedInputHoverCard from "./LocalizedInputHoverCard";
import LocalizedInputLabel from "./LocalizedInputLabel";

interface LocalizedTextareaProps extends Omit<
  TextareaProps,
  "defaultValue" | "value" | "onChange" | "required"
> {
  currentLocale: string;
  /** The locale key currently stored for this field. */
  contentKey: string | undefined;
  /** Optional prefix passed to makeLocaleKey when generating a new key. */
  keyPrefix?: string;
  /**
   * Called when the locale key changes (main locale edits that rotate the key).
   */
  onLocaleKeyChange?: (newKey: string) => void;
  /**
   * Changing this value causes the underlying textarea to remount, resetting
   * its displayed value from the store. Useful for external resets.
   */
  remountKey?: string | number;
  /** Debounce delay in ms. Defaults to 300. */
  debounce?: number;
}

/**
 * A Mantine `Textarea` that manages locale entry sync internally.
 *
 * Reads the current display value from the Redux locale store via `localeKey`,
 * debounces user input, and calls `syncLocaleField` to persist changes.
 */
export default function LocalizedTextarea({
  currentLocale,
  contentKey,
  keyPrefix,
  onLocaleKeyChange,
  remountKey,
  debounce = 300,
  ...rest
}: LocalizedTextareaProps) {
  const dispatch = useAppDispatch();

  const localeEntries = useAppSelector(
    (state: RootState) => state.locale.entries.entities,
  );

  const existingEntry = contentKey ? (localeEntries[contentKey] ?? null) : null;
  const displayValue = existingEntry?.v ?? "";

  const [ctxOpened, { open: openCtx, close: closeCtx }] = useDisclosure(false);

  const handleChange = useDebouncedCallback((newText: string) => {
    const newKey = syncLocaleField({
      locale: currentLocale,
      existingEntry,
      newText: newText || null,
      makeKey: (text) => makeLocaleKey({ text, prefix: keyPrefix }),
      dispatch,
    });
    if (newKey !== undefined) {
      onLocaleKeyChange?.(newKey);
    }
  }, debounce);

  const handleCtxSave = (newCtx: string | undefined) => {
    if (!existingEntry) return;
    syncLocaleField({
      locale: currentLocale,
      existingEntry,
      newText: existingEntry.v,
      makeKey: () => existingEntry.k,
      ctx: newCtx,
      dispatch,
    });
  };

  const labelWithCtx =
    rest.label != null || existingEntry ? (
      <LocalizedInputLabel
        label={rest.label}
        showContextButton={!!existingEntry}
        onContextClick={openCtx}
      />
    ) : undefined;

  return (
    <>
      <LocalizedInputHoverCard ctx={existingEntry?.ctx}>
        <Textarea
          key={`${currentLocale}-${remountKey ?? ""}`}
          defaultValue={displayValue}
          onChange={(event) => handleChange(event.currentTarget.value)}
          {...rest}
          label={labelWithCtx ?? rest.label}
        />
      </LocalizedInputHoverCard>
      <LocaleContextModal
        opened={ctxOpened}
        onClose={closeCtx}
        originalText={existingEntry?.original ?? null}
        initialCtx={existingEntry?.ctx}
        onSave={handleCtxSave}
      />
    </>
  );
}
