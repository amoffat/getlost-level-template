import { Combobox, InputBase, useCombobox } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

interface SelectWithCustomProps {
  /** Predefined options shown in the dropdown. */
  options: readonly string[];
  /**
   * Initial value. Pass `undefined` to indicate mixed values across a
   * multi-selection (shows a warning icon and mixed-values placeholder).
   */
  defaultValue: string | undefined;
  placeholder?: string;
  mixedPlaceholder?: string;
  onChange: (val: string) => void;
}

export default function SelectWithCustom({
  options,
  defaultValue: initialValue,
  placeholder,
  mixedPlaceholder,
  onChange,
}: SelectWithCustomProps) {
  const { t } = useTranslation();
  const isMixed = initialValue === undefined;

  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const committedRef = useRef(initialValue ?? "");
  const [search, setSearch] = useState(initialValue ?? "");

  const clearInput = () => {
    setSearch("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const restoreInput = () => {
    const val = committedRef.current;
    setSearch(val);
    if (inputRef.current) inputRef.current.value = val;
  };

  const exactOptionMatch = options.some((item) => item === search);
  const filteredOptions = options.filter((item) =>
    item.toLowerCase().includes(search.toLowerCase().trim()),
  );

  const optionItems = filteredOptions.map((item) => (
    <Combobox.Option value={item} key={item}>
      {item}
    </Combobox.Option>
  ));

  return (
    <Combobox
      store={combobox}
      withinPortal={false}
      onOptionSubmit={(val) => {
        const chosen = val === "$custom" ? search : val;
        committedRef.current = chosen;
        onChange(chosen);
        setSearch(chosen);
        if (inputRef.current) inputRef.current.value = chosen;
        combobox.closeDropdown();
      }}
    >
      <Combobox.Target>
        <InputBase
          ref={inputRef}
          leftSection={isMixed ? <IconAlertTriangle size={14} /> : undefined}
          rightSection={<Combobox.Chevron />}
          rightSectionPointerEvents="none"
          defaultValue={search}
          onChange={(event) => {
            combobox.openDropdown();
            combobox.updateSelectedOptionIndex();
            setSearch(event.currentTarget.value);
          }}
          onClick={() => combobox.openDropdown()}
          onFocus={() => {
            const current = inputRef.current?.value ?? "";
            if (options.includes(current)) clearInput();
            combobox.openDropdown();
          }}
          onBlur={() => {
            combobox.closeDropdown();
            const current = inputRef.current?.value ?? "";
            if (current.trim()) {
              committedRef.current = current;
              onChange(current);
            } else {
              restoreInput();
            }
          }}
          placeholder={
            isMixed
              ? (mixedPlaceholder ?? t("selectWithCustomMixedPlaceholder"))
              : (placeholder ?? t("selectWithCustomPlaceholder"))
          }
        />
      </Combobox.Target>
      <Combobox.Dropdown>
        <Combobox.Options>
          {optionItems}
          {!exactOptionMatch && search.trim().length > 0 && (
            <Combobox.Option value="$custom">
              {t("selectWithCustomUseValue", { value: search })}
            </Combobox.Option>
          )}
          {filteredOptions.length === 0 && search.trim().length === 0 && (
            <Combobox.Empty>{t("selectWithCustomNoOptions")}</Combobox.Empty>
          )}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}
