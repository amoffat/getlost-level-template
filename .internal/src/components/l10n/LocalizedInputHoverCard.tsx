import { Stack, Text, Title, Tooltip } from "@mantine/core";
import { ReactNode } from "react";

interface LocalizedInputHoverCardProps {
  /** The input element to wrap. */
  children: ReactNode;
  /** Translation context string. Tooltip is only shown when this is non-empty. */
  ctx?: string;
}

/**
 * Wraps a localized input with a Tooltip that displays translation context.
 * If `ctx` is empty/undefined the tooltip is omitted and children are rendered as-is.
 */
export default function LocalizedInputHoverCard({
  children,
  ctx,
}: LocalizedInputHoverCardProps) {
  if (!ctx) {
    return <>{children}</>;
  }

  return (
    <Tooltip
      position="left-start"
      withArrow
      multiline
      w={280}
      label={
        <Stack gap={4}>
          <Title order={5}>Translation Context:</Title>
          <Text size="sm">{ctx}</Text>
        </Stack>
      }
    >
      {children}
    </Tooltip>
  );
}
