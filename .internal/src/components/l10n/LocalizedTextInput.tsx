import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { RootState } from "@/store/store";
import { makeLocaleKey, syncLocaleField } from "@/utils/locale";
import { TextInput, TextInputProps } from "@mantine/core";
import { useDebouncedCallback, useDisclosure } from "@mantine/hooks";
import LocaleContextModal from "./LocaleContextModal";
import LocalizedInputHoverCard from "./LocalizedInputHoverCard";
import LocalizedInputLabel from "./LocalizedInputLabel";

interface LocalizedTextInputProps extends Omit<
  TextInputProps,
  "defaultValue" | "value" | "onChange" | "required"
> {
  currentLocale: string;
  /** The locale key currently stored for this field. */
  contentKey: string | undefined;
  /** Optional prefix passed to makeLocaleKey when generating a new key. */
  keyPrefix?: string;
  /**
   * Called when the locale key changes (main locale edits that rotate the key).
   * Not called when editing a non-main locale or when text is cleared.
   */
  onLocaleKeyChange?: (newKey: string) => void;

  /** Debounce delay in ms. Defaults to 300. */
  debounce?: number;
  /**
   * When false, suppresses the translation-context button in the label area.
   * Useful when the parent renders its own context button. Defaults to true.
   */
  showContextButton?: boolean;
}

/**
 * A Mantine `TextInput` that manages locale entry sync internally.
 *
 * Reads the current display value from the Redux locale store via `localeKey`,
 * debounces user input, and calls `syncLocaleField` to persist changes.
 */
export default function LocalizedTextInput({
  currentLocale,
  contentKey,
  keyPrefix,
  onLocaleKeyChange,
  debounce = 300,
  showContextButton = true,
  ...rest
}: LocalizedTextInputProps) {
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

  const ctxButtonVisible = showContextButton && !!existingEntry;
  const labelWithCtx =
    rest.label != null || ctxButtonVisible ? (
      <LocalizedInputLabel
        label={rest.label}
        showContextButton={ctxButtonVisible}
        onContextClick={openCtx}
      />
    ) : undefined;

  return (
    <>
      <LocalizedInputHoverCard ctx={existingEntry?.ctx}>
        <TextInput
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
