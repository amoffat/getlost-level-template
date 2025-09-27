import { Image, UnstyledButton } from "@mantine/core";

interface TilesetButtonProps {
  onClick: () => void;
  imgSrc: string;
  isActive?: boolean;
}

export default function TilesetButton({
  onClick,
  imgSrc,
  isActive,
}: TilesetButtonProps) {
  return (
    <UnstyledButton
      p={0}
      onClick={onClick}
      style={(theme) => ({
        overflow: "hidden",
        border: isActive
          ? `2px solid ${theme.colors.blue[6]}`
          : "2px solid transparent",
        "&:hover": {
          borderColor: theme.colors.gray[4],
          cursor: "pointer",
        },
      })}
    >
      <Image src={imgSrc} draggable={false} />
    </UnstyledButton>
  );
}
