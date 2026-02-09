import { LoadingOverlay, Text } from "@mantine/core";

interface PanelLoaderProps {
  message?: string;
  visible?: boolean;
}

/**
 * PanelLoader renders a centered spinner with an optional message.
 * Used as a Suspense fallback while editor panels initialize.
 */
export default function PanelLoader({
  message,
  visible = true,
}: PanelLoaderProps) {
  return (
    <LoadingOverlay
      visible={visible}
      zIndex={1000}
      overlayProps={{ blur: 3 }}
      loaderProps={{
        children: (
          <Text c="white" fw={500} mt="md">
            {message ?? "Loading..."}
          </Text>
        ),
      }}
    />
  );
}
