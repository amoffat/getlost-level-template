import { useLocaleContextModal } from "@/contexts/LocaleContextModalContext";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { selectors as localeSelectors } from "@/slices/locale";
import { RootState } from "@/store/store";
import { upsertLocaleEntry } from "@/thunks/locale";
import { newLocaleId } from "@/utils/locale";
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
  /** The locale key currently stored for this field. */
  contentKey: string | null | undefined;
  defaultContext?: string;
  /**
   * Called when the locale *reference* this field should store changes: the id
   * of a newly created source string, or `null` when the source text is cleared.
   * Not called for edits that leave the reference untouched.
   */
  onLocaleRefChange?: (newRef: string | null) => void;
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
  contentKey,
  defaultContext,
  onLocaleRefChange,
  debounce = 300,
  contextButton = true,
  actionButtons,
  ...rest
}: LocalizedTextareaProps) {
  const dispatch = useAppDispatch();
  const { openLocaleContextModal } = useLocaleContextModal();

  const currentLocale = useAppSelector(localeSelectors.activeLocale);
  const localeEntries = useAppSelector(localeSelectors.selectActiveEntries);
  const defaultEntry = useAppSelector((state: RootState) =>
    localeSelectors.selectDefaultEntry(state, contentKey),
  );

  const prevEntry = contentKey ? localeEntries[contentKey] : undefined;

  const handleChange = useDebouncedCallback((newText: string) => {
    const id = contentKey ?? newLocaleId();
    const result = dispatch(
      upsertLocaleEntry({
        id,
        v: newText.trim() === "" ? null : newText,
        ctx: defaultContext,
      }),
    );
    // Only "created"/"cleared" are actual reference changes to propagate to the
    // owning object; "unchanged" (edited an existing entry, or a translation
    // edit) leaves the stored reference alone.
    if (result === "created") onLocaleRefChange?.(id);
    else if (result === "cleared") onLocaleRefChange?.(null);
  }, debounce);

  const handleCtxSave = useCallback(
    (newCtx: string | null | undefined) => {
      if (!prevEntry && !defaultEntry) return;
      dispatch(
        upsertLocaleEntry({
          id: contentKey ?? newLocaleId(),
          ctx: newCtx,
        }),
      );
    },
    [prevEntry, defaultEntry, dispatch, contentKey],
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
  const labelWithCtx = (contextButton || hasActionButtons) &&
    rest.label != null && (
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
