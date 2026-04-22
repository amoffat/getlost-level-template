import { defaultLocale } from "@/constants";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { selectors as localeSelectors } from "@/slices/locale";
import { RootState } from "@/store/store";
import { makeKey, syncLocaleField } from "@/utils/locale";
import { Group, TextInput, TextInputProps } from "@mantine/core";
import { useDebouncedCallback, useDisclosure } from "@mantine/hooks";
import { IconLanguage } from "@tabler/icons-react";
import ActionButton from "./ActionButton";
import LocaleContextModal from "./LocaleContextModal";
import LocalizedInputHoverCard from "./LocalizedInputHoverCard";
import LocalizedInputLabel from "./LocalizedInputLabel";

interface LocalizedTextInputProps extends Omit<
  TextInputProps,
  "defaultValue" | "value" | "onChange"
> {
  currentLocale: string;
  /** The locale key currently stored for this field. */
  contentKey: string | undefined;
  /** Optional prefix passed to makeLocaleKey when generating a new key. */
  keyPrefix?: string[];
  defaultContext?: string;
  /**
   * Called when the locale key changes (main locale edits that rotate the key).
   * Not called when editing a non-main locale or when text is cleared.
   */
  onLocaleKeyChange?: (newKey: string) => void;

  /** Debounce delay in ms. Defaults to 300. */
  debounce?: number;
  /**
   * Controls where the translation-context button is rendered.
   * - `"label"` (default): button appears inside the input label area.
   * - `"inline"`: button appears to the right of the input in a flex row,
   *   and the `style` prop is applied to the outer wrapper instead of the input.
   */
  contextButton?: "label" | "inline" | false;
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
  keyPrefix = [],
  defaultContext,
  onLocaleKeyChange,
  debounce = 300,
  contextButton = "label",
  ...rest
}: LocalizedTextInputProps) {
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
      makeKey: ({ text, context }) => makeKey(...keyPrefix, context, text),
      dispatch,
      updates: {
        v: newText.trim() === "" ? null : newText,
        ctx: defaultContext,
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

  const originalText = defaultEntry?.v ?? prevEntry?.v;

  if (contextButton === "inline") {
    const { style: wrapperStyle, ...inputRest } = rest;
    return (
      <>
        <Group gap="xs" wrap="nowrap" align="center" style={wrapperStyle}>
          <LocalizedInputHoverCard ctx={defaultEntry?.ctx}>
            <TextInput
              defaultValue={prevEntry?.v ?? defaultEntry?.v}
              onChange={(event) => handleChange(event.currentTarget.value)}
              {...inputRest}
              style={{ flex: 1 }}
            />
          </LocalizedInputHoverCard>
          {currentLocale === defaultLocale && (
            <ActionButton
              tooltip="Translation context"
              icon={<IconLanguage size={12} />}
              onClick={openCtx}
              disabled={!prevEntry && !defaultEntry}
            />
          )}
        </Group>
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

  if (contextButton === false) {
    return (
      <>
        <TextInput
          defaultValue={prevEntry?.v ?? defaultEntry?.v}
          onChange={(event) => handleChange(event.currentTarget.value)}
          {...rest}
        />
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

  const labelWithCtx = (
    <LocalizedInputLabel
      locale={currentLocale}
      label={rest.label}
      onContextClick={openCtx}
    />
  );

  return (
    <>
      <LocalizedInputHoverCard ctx={defaultEntry?.ctx}>
        <TextInput
          defaultValue={prevEntry?.v ?? defaultEntry?.v}
          onChange={(event) => handleChange(event.currentTarget.value)}
          {...rest}
          label={labelWithCtx}
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
