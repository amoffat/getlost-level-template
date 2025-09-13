import { HoverCard } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { ReactNode } from "react";

type HelpHoverCardProps = {
  children: ReactNode;
};

export default function HelpHoverCard({ children }: HelpHoverCardProps) {
  return (
    <HoverCard width={260} shadow="md" radius={0} withArrow openDelay={500}>
      <HoverCard.Target>
        <IconInfoCircle size={16} />
      </HoverCard.Target>
      <HoverCard.Dropdown>{children}</HoverCard.Dropdown>
    </HoverCard>
  );
}
