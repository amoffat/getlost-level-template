import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { selectors as localeSelectors } from "@/slices/locale";
import { RootState } from "@/store/store";
import { makeKey, syncLocaleField } from "@/utils/locale";
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
  debounce = 300,
  ...rest
}: LocalizedTextareaProps) {
  const dispatch = useAppDispatch();

  const localeEntries = useAppSelector(localeSelectors.selectActiveEntries);
  const defaultEntry = useAppSelector((state: RootState) =>
    localeSelectors.selectDefaultEntry(state, contentKey),
  );

  const prevEntry = contentKey ? localeEntries[contentKey] : undefined;

  const [ctxOpened, { open: openCtx, close: closeCtx }] = useDisclosure(false);

  const handleChange = useDebouncedCallback((newText: string) => {
    const newKey = syncLocaleField({
      locale: currentLocale,
      prevEntry,
      defaultEntry,
      makeKey: ({ text, context }) => makeKey(keyPrefix, context, text),
      dispatch,
      updates: {
        v: newText.trim() === "" ? null : newText,
      },
    });
    if (newKey !== undefined) {
      onLocaleKeyChange?.(newKey);
    }
  }, debounce);

  const handleCtxSave = (newCtx: string | null | undefined) => {
    if (!prevEntry && !defaultEntry) return;
    syncLocaleField({
      locale: currentLocale,
      prevEntry,
      defaultEntry,
      makeKey: () => (prevEntry ?? defaultEntry)!.k,
      dispatch,
      updates: {
        ctx: newCtx,
      },
    });
  };

  const labelWithCtx = rest.label != null && (
    <LocalizedInputLabel
      locale={currentLocale}
      label={rest.label}
      onContextClick={openCtx}
    />
  );

  const originalText = defaultEntry?.v ?? prevEntry?.v;

  return (
    <>
      <LocalizedInputHoverCard ctx={defaultEntry?.ctx}>
        <Textarea
          defaultValue={prevEntry?.v ?? defaultEntry?.v}
          onChange={(event) => handleChange(event.currentTarget.value)}
          {...rest}
          label={labelWithCtx ?? rest.label}
        />
      </LocalizedInputHoverCard>
      <LocaleContextModal
        key={originalText}
        opened={ctxOpened}
        onClose={closeCtx}
        originalText={originalText}
        initialCtx={defaultEntry?.ctx}
        onSave={handleCtxSave}
      />
    </>
  );
}
