import { mantineMarkdownComponents } from "@/utils/markdown";
import { Box, Center, Loader, Modal } from "@mantine/core";
import { Suspense, use } from "react";
import Markdown from "react-markdown";

type MaybeAsyncMarkdown = string | Promise<string>;

export function MarkdownModal({
  title,
  opened,
  close,
  children,
}: {
  title: string;
  opened: boolean;
  close: () => void;
  children: MaybeAsyncMarkdown;
}) {
  return (
    <Modal opened={opened} onClose={close} title={title} size="xl" centered>
      <Box p="lg">
        <Suspense
          fallback={
            <Center>
              <Loader size="lg" />
            </Center>
          }
        >
          <MarkdownContent children={children} />
        </Suspense>
      </Box>
    </Modal>
  );
}
function MarkdownContent({ children }: { children: MaybeAsyncMarkdown }) {
  let content: string;
  if (children instanceof Promise) {
    content = use(children);
  } else {
    content = children;
  }
  return <Markdown components={mantineMarkdownComponents}>{content}</Markdown>;
}
