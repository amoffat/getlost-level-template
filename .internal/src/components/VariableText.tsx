import { getDescription, parseVariables } from "@/utils/variableMap";
import { Tooltip } from "@mantine/core";
import classNames from "classnames";
import styles from "./VariableText.module.css";

interface VariableTextProps {
  text: string | undefined;
}

/**
 * Renders dialogue text with `{variable}` tokens highlighted as interactive
 * inline chips. Known variables show a blue chip with a description tooltip;
 * unknown variables show an orange chip with a generic warning tooltip.
 *
 * No actual substitution occurs — this is purely a visual aid for level designers.
 */
export default function VariableText({ text }: VariableTextProps) {
  if (!text) return null;

  const segments = parseVariables(text);

  return (
    <span>
      {segments.map((seg, i) => {
        if (seg.type === "text") {
          return <span key={i}>{seg.value}</span>;
        }

        const description = getDescription(seg.key);

        return (
          <Tooltip key={i} label={description} withArrow multiline maw={220}>
            <span
              className={classNames(
                styles.chip,
                seg.known ? styles.known : styles.unknown,
              )}
            >
              {seg.key}
            </span>
          </Tooltip>
        );
      })}
    </span>
  );
}
