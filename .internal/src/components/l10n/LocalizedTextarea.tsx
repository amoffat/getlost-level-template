import { useLocaleContextModal } from "@/contexts/LocaleContextModalContext";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { selectors as localeSelectors } from "@/slices/locale";
import { RootState } from "@/store/store";
import { syncLocaleField } from "@/utils/locale";
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
  defaultContext?: string;
  /**
   * Called when the locale key changes (main locale edits that rotate the key).
   */
  onLocaleKeyChange?: (newKey: string | null) => void;
  /** Debounce delay in ms. Defaults to 300. */
  debounce?: number;
  /** Whether to render the translation-context button in the label. Defaults to true. */
  contextButton?: boolean;
  /** Additional action buttons to display next to the label. */
  actionButtons?: React.ReactNode[];
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
  defaultContext,
  onLocaleKeyChange,
  debounce = 300,
  contextButton = true,
  actionButtons,
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
    const ref = syncLocaleField({
      locale: currentLocale,
      prevEntry,
      defaultEntry,
      dispatch,
      updates: {
        v: newText.trim() === "" ? null : newText,
        ctx: defaultContext,
      },
    });
    // `undefined` means "leave the stored reference as-is" (edited an existing
    // entry, or a translation edit). A string (new id) or `null` (cleared) is
    // an actual reference change to propagate to the owning object.
    if (ref !== undefined) onLocaleKeyChange?.(ref);
  }, debounce);

  const handleCtxSave = useCallback(
    (newCtx: string | null | undefined) => {
      if (!prevEntry && !defaultEntry) return;
      syncLocaleField({
        locale: currentLocale,
        prevEntry,
        defaultEntry,
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

  const hasActionButtons = actionButtons && actionButtons.length > 0;
  const labelWithCtx = (contextButton || hasActionButtons) && rest.label != null && (
    <LocalizedInputLabel
      locale={currentLocale}
      label={rest.label}
      onContextClick={openCtx}
      showContextButton={contextButton}
      actionButtons={actionButtons}
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
