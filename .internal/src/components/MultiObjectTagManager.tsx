import { Badge, Group, TagsInput, Text } from "@mantine/core";
import { useCallback, useMemo } from "react";

export interface TaggedObject {
  id: string;
  tags: string[];
}

export interface MultiObjectTagManagerProps {
  /** Array of objects with their IDs and tags */
  objects: TaggedObject[];
  /** Callback fired when a tag is added to objects */
  onTagAdded: (ids: string[], tag: string) => void;
  /** Callback fired when a tag is removed from objects */
  onTagRemoved: (ids: string[], tag: string) => void;
  /** Optional list of suggested tags to show in dropdown */
  suggestions?: string[];
  /** Optional placeholder text */
  placeholder?: string;
  /** Optional label for the input */
  label?: string;
  /** Optional description for the input */
  description?: string;
}

/**
 * Component for managing tags across multiple objects.
 * Shows all unique tags with counts indicating how many objects have each tag.
 * Adding a tag applies it to all objects. Removing a tag removes it from all objects.
 */
export default function MultiObjectTagManager({
  objects,
  onTagAdded,
  onTagRemoved,
  suggestions = [],
  placeholder = "Enter tag",
  label,
  description,
}: MultiObjectTagManagerProps) {
  // Calculate tag counts and unique tags with display values
  const { tagCounts, displayTags } = useMemo(() => {
    const counts = new Map<string, number>();

    // Count occurrences of each tag across all objects
    for (const obj of objects) {
      for (const tag of obj.tags) {
        counts.set(tag, (counts.get(tag) || 0) + 1);
      }
    }

    // Create display tags with counts appended
    const totalObjects = objects.length;
    const tags = Array.from(counts.keys())
      .sort()
      .map((tag) => {
        const count = counts.get(tag) || 0;
        return `${tag} (${count}/${totalObjects})`;
      });

    return {
      tagCounts: counts,
      displayTags: tags,
    };
  }, [objects]);

  // Get all object IDs
  const allIds = useMemo(() => objects.map((obj) => obj.id), [objects]);

  // Extract the actual tag from the display value (removes the count suffix)
  const extractTag = useCallback((displayValue: string): string => {
    // Match everything before the count pattern " (n/m)"
    const match = displayValue.match(/^(.+?)\s*\(\d+\/\d+\)$/);
    return match ? match[1] : displayValue;
  }, []);

  // Handle adding a new tag
  const handleAddTag = useCallback(
    (displayValue: string) => {
      const tag = extractTag(displayValue).trim();
      if (tag.length === 0) return;

      // Don't add if it already exists on all objects
      const count = tagCounts.get(tag) || 0;
      if (count === objects.length) return;

      onTagAdded(allIds, tag);
    },
    [allIds, onTagAdded, tagCounts, objects.length, extractTag]
  );

  // Handle removing a tag
  const handleRemoveTag = useCallback(
    (displayValue: string) => {
      const tag = extractTag(displayValue);
      onTagRemoved(allIds, tag);
    },
    [allIds, onTagRemoved, extractTag]
  );

  // Custom rendering for dropdown options to show count badges
  const renderOption = useCallback(
    (item: { option: { value: string } }) => {
      const displayValue = item.option.value;
      const tag = extractTag(displayValue);
      const count = tagCounts.get(tag) || 0;
      const totalObjects = objects.length;

      return (
        <Group gap="xs" wrap="nowrap">
          <Text size="sm">{tag}</Text>
          <Badge
            size="xs"
            variant={count === totalObjects ? "filled" : "light"}
            color={count === totalObjects ? "blue" : "gray"}
          >
            {count}/{totalObjects}
          </Badge>
        </Group>
      );
    },
    [tagCounts, objects.length, extractTag]
  );

  // Merge suggestions with display tags for the dropdown data
  const dropdownData = useMemo(() => {
    // Create a set of existing tags (without counts) for quick lookup
    const existingTags = new Set(
      Array.from(tagCounts.keys()).map((tag) => tag.toLowerCase())
    );

    // Filter suggestions to only show those not already present
    const newSuggestions = suggestions
      .filter((s) => !existingTags.has(s.toLowerCase()))
      .map((s) => `${s} (0/${objects.length})`);

    return [...newSuggestions, ...displayTags];
  }, [suggestions, displayTags, tagCounts, objects.length]);

  return (
    <TagsInput
      label={label}
      description={description}
      placeholder={placeholder}
      value={displayTags}
      data={dropdownData}
      onOptionSubmit={handleAddTag}
      onRemove={handleRemoveTag}
      splitChars={[",", " ", "|"]}
      maxDropdownHeight={200}
      renderOption={renderOption}
      clearable
    />
  );
}
