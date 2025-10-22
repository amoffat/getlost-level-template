import { Box, Loader, Text } from "@mantine/core";

export interface PanelLoaderProps {
  message?: string;
  fullHeight?: boolean;
}

/**
 * PanelLoader renders a centered spinner with an optional message.
 * Used as a Suspense fallback while editor panels initialize.
 */
export function PanelLoader({ message, fullHeight = true }: PanelLoaderProps) {
  return (
    <Box
      pos="relative"
      style={{
        height: fullHeight ? "100dvh" : "100%",
      }}
    >
      <Box
        pos="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          justifyContent: "center",
          alignItems: "center",
          background: "rgba(0 0 0 / 0.35)",
          backdropFilter: "blur(2px)",
        }}
      >
        <Loader size="lg" />
        <Text c="white" fw={500} ta="center">
          {message ?? "Loading..."}
        </Text>
      </Box>
    </Box>
  );
}

export default PanelLoader;
