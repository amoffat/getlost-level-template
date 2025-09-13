import { ActionIcon, HoverCard } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { ReactNode } from "react";

type HelpHoverCardProps = {
  children: ReactNode;
};

export default function HelpHoverCard({ children }: HelpHoverCardProps) {
  return (
    <HoverCard width={260} shadow="md" radius={0} withArrow openDelay={500}>
      <HoverCard.Target>
        <ActionIcon variant="subtle" size="xs" aria-label="Help">
          <IconInfoCircle size={16} />
        </ActionIcon>
      </HoverCard.Target>
      <HoverCard.Dropdown>{children}</HoverCard.Dropdown>
    </HoverCard>
  );
}
