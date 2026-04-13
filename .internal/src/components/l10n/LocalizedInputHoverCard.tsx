import { HoverCard, Text, Title } from "@mantine/core";
import { IconLanguage } from "@tabler/icons-react";
import { ReactNode } from "react";

interface LocalizedInputHoverCardProps {
  /** The input element to wrap. */
  children: ReactNode;
  /** Translation context string. HoverCard is only shown when this is non-empty. */
  ctx?: string;
}

/**
 * Wraps a localized input with a HoverCard that displays translation context.
 * If `ctx` is empty/undefined the card is omitted and children are rendered as-is.
 */
export default function LocalizedInputHoverCard({
  children,
  ctx,
}: LocalizedInputHoverCardProps) {
  if (!ctx) return <>{children}</>;

  return (
    <HoverCard position="left-start" withArrow>
      <HoverCard.Target>{children}</HoverCard.Target>
      <HoverCard.Dropdown>
        <Title order={3}>
          <IconLanguage />
          Translation Context:
        </Title>
        <Text>{ctx}</Text>
      </HoverCard.Dropdown>
    </HoverCard>
  );
}
