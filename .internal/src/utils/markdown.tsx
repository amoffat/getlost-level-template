import {
  Anchor,
  Box,
  Code,
  Divider,
  List,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { Components } from "react-markdown";

export const mantineMarkdownComponents: Components = {
  h1: ({ children }) => (
    <Title order={1} mb="md">
      {children}
    </Title>
  ),
  h2: ({ children }) => (
    <Title order={2} mb="sm" mt="lg">
      {children}
    </Title>
  ),
  h3: ({ children }) => (
    <Title order={3} mb="sm" mt="md">
      {children}
    </Title>
  ),
  h4: ({ children }) => (
    <Title order={4} mb="xs" mt="md">
      {children}
    </Title>
  ),
  h5: ({ children }) => (
    <Title order={5} mb="xs" mt="sm">
      {children}
    </Title>
  ),
  h6: ({ children }) => (
    <Title order={6} mb="xs" mt="sm">
      {children}
    </Title>
  ),
  p: ({ children }) => (
    <Text mb="sm" size="sm">
      {children}
    </Text>
  ),
  a: ({ href, children }) => (
    <Anchor href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </Anchor>
  ),
  ul: ({ children }) => (
    <List mb="sm" size="sm">
      {children}
    </List>
  ),
  ol: ({ children }) => (
    <List type="ordered" mb="sm" size="sm">
      {children}
    </List>
  ),
  li: ({ children }) => <List.Item>{children}</List.Item>,
  code: ({ inline, children }: any) =>
    inline ? (
      <Code>{children}</Code>
    ) : (
      <Code block mb="sm">
        {children}
      </Code>
    ),
  hr: () => <Divider my="md" />,
  blockquote: ({ children }) => (
    <Box
      pl="md"
      my="sm"
      style={(theme) => ({
        borderLeft: `4px solid ${theme.colors.gray[4]}`,
      })}
    >
      {children}
    </Box>
  ),
  table: ({ children }) => <Table mb="sm">{children}</Table>,
  strong: ({ children }) => (
    <Text component="strong" fw={700}>
      {children}
    </Text>
  ),
  em: ({ children }) => (
    <Text component="em" fs="italic">
      {children}
    </Text>
  ),
};
