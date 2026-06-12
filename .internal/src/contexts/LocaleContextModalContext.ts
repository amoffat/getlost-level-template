import { createContext, useContext } from "react";

export interface LocaleContextModalParams {
  originalText: string | undefined;
  initialCtx: string | undefined;
  onSave: (ctx: string | null | undefined) => void;
}

interface LocaleContextModalContextValue {
  openLocaleContextModal: (params: LocaleContextModalParams) => void;
}

const defaultValue: LocaleContextModalContextValue = {
  openLocaleContextModal: () => {},
};

export const LocaleContextModalContext =
  createContext<LocaleContextModalContextValue>(defaultValue);

export function useLocaleContextModal() {
  return useContext(LocaleContextModalContext);
}
