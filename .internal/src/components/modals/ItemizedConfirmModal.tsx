import { Button, List, ThemeIcon, Transition } from "@mantine/core";
import { ContextModalProps } from "@mantine/modals";
import { IconAlertTriangle, IconCheck } from "@tabler/icons-react";
import { ReactNode, useEffect, useMemo, useState } from "react";

interface ItemizedConfirmModalProps {
  onConfirm: () => void;
  msg: ReactNode;
  confirmLabel: ReactNode;
  items: { ok: boolean; message: string }[];
  itemDelay?: number;
}

export default function ItemizedConfirmModal({
  context,
  id,
  innerProps,
}: ContextModalProps<ItemizedConfirmModalProps>) {
  const { items, onConfirm, msg, itemDelay, confirmLabel } = innerProps;

  // Track which items have been shown
  const [visibleItems, setVisibleItems] = useState<number[]>([]);
  const [buttonEnabled, setButtonEnabled] = useState(false);

  // Duration for each item's animation (in ms)
  const itemDelayValue = itemDelay ?? 750;
  const animateDuration = 500;

  // Animate items in one at a time
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    items.forEach((_, index) => {
      const timer = setTimeout(() => {
        setVisibleItems((prev) => [...prev, index]);
      }, index * itemDelayValue);
      timers.push(timer);
    });

    // Enable button after all items are shown plus one more time unit
    const buttonTimer = setTimeout(
      () => {
        setButtonEnabled(true);
      },
      items.length * itemDelayValue + itemDelayValue
    );
    timers.push(buttonTimer);

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [itemDelayValue, items]);

  const goodIcon = useMemo(
    () => (
      <ThemeIcon color="teal" size={24} radius="xl">
        <IconCheck size={16} />
      </ThemeIcon>
    ),
    []
  );
  const warnIcon = useMemo(
    () => (
      <ThemeIcon color="orange" size={24} radius="xl">
        <IconAlertTriangle size={16} />
      </ThemeIcon>
    ),
    []
  );

  const handleConfirm = () => {
    onConfirm();
    context.closeModal(id);
  };

  return (
    <>
      {msg}
      <List mt="md" spacing="sm" size="sm" center>
        {items.map((item, index) => (
          <Transition
            key={index}
            mounted={visibleItems.includes(index)}
            transition="fade"
            duration={animateDuration}
            timingFunction="ease-in-out"
          >
            {(styles) => (
              <List.Item style={styles} icon={item.ok ? goodIcon : warnIcon}>
                {item.message}
              </List.Item>
            )}
          </Transition>
        ))}
      </List>
      <Button
        fullWidth
        mt="md"
        variant={"filled"}
        color="red"
        onClick={handleConfirm}
        disabled={!buttonEnabled}
      >
        {confirmLabel}
      </Button>
    </>
  );
}
