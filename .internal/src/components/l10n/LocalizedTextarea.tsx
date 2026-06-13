import { useLocaleContextModal } from "@/contexts/LocaleContextModalContext";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { selectors as localeSelectors } from "@/slices/locale";
import { RootState } from "@/store/store";
import { makeKey, syncLocaleField } from "@/utils/locale";
import { Textarea, TextareaProps } from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
import React, { useCallback, useImperativeHandle } from "react";
import LocalizedInputHoverCard from "./LocalizedInputHoverCard";
import LocalizedInputLabel from "./LocalizedInputLabel";

export interface LocalizedTextareaHandle {
  openCtx: () => void;
}

interface LocalizedTextareaProps extends Omit<
  TextareaProps,
  "ref" | "defaultValue" | "value" | "onChange" | "required"
> {
  ref?: React.Ref<LocalizedTextareaHandle>;
  currentLocale: string;
  /** The locale key currently stored for this field. */
  contentKey: string | null | undefined;
  /** Optional prefix passed to makeLocaleKey when generating a new key. */
  keyPrefix?: string[];
  defaultContext?: string;
  /**
   * Called when the locale key changes (main locale edits that rotate the key).
   */
  onLocaleKeyChange?: (newKey: string | null) => void;
  /** Debounce delay in ms. Defaults to 300. */
  debounce?: number;
  /** Whether to render the translation-context button in the label. Defaults to true. */
  contextButton?: boolean;
}

/**
 * A Mantine `Textarea` that manages locale entry sync internally.
 *
 * Reads the current display value from the Redux locale store via `localeKey`,
 * debounces user input, and calls `syncLocaleField` to persist changes.
 */
export default function LocalizedTextarea({
  ref,
  currentLocale,
  contentKey,
  keyPrefix = [],
  defaultContext,
  onLocaleKeyChange,
  debounce = 300,
  contextButton = true,
  ...rest
}: LocalizedTextareaProps) {
  const dispatch = useAppDispatch();
  const { openLocaleContextModal } = useLocaleContextModal();

  const localeEntries = useAppSelector(localeSelectors.selectActiveEntries);
  const defaultEntry = useAppSelector((state: RootState) =>
    localeSelectors.selectDefaultEntry(state, contentKey),
  );

  const prevEntry = contentKey ? localeEntries[contentKey] : undefined;

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
    onLocaleKeyChange?.(newKey ?? null);
  }, debounce);

  const handleCtxSave = useCallback(
    (newCtx: string | null | undefined) => {
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
    },
    [prevEntry, defaultEntry, currentLocale, dispatch],
  );

  const originalText = defaultEntry?.v ?? prevEntry?.v;

  const openCtx = useCallback(() => {
    openLocaleContextModal({
      originalText,
      initialCtx: defaultEntry?.ctx,
      onSave: handleCtxSave,
    });
  }, [openLocaleContextModal, originalText, defaultEntry?.ctx, handleCtxSave]);

  useImperativeHandle(ref, () => ({ openCtx }), [openCtx]);

  const labelWithCtx = contextButton && rest.label != null && (
    <LocalizedInputLabel
      locale={currentLocale}
      label={rest.label}
      onContextClick={openCtx}
    />
  );

  return (
    <LocalizedInputHoverCard ctx={defaultEntry?.ctx}>
      <Textarea
        defaultValue={prevEntry?.v ?? defaultEntry?.v}
        onChange={(event) => handleChange(event.currentTarget.value)}
        {...rest}
        label={labelWithCtx ?? rest.label}
      />
    </LocalizedInputHoverCard>
  );
}
