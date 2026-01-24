import { Comms } from "@/iframe";
import { GetTimeRequest } from "@/iframe/request";
import { Button, Stack, Text } from "@mantine/core";
import { TimeValue } from "@mantine/dates";
import { useCallback, useDeferredValue, useEffect, useState } from "react";

interface TimeDisplayProps {
  comms: Comms | null;
}

export default function TimeDisplay({ comms }: TimeDisplayProps) {
  const [_currentTime, setCurrentTime] = useState<Date>(new Date());
  const currentTime = useDeferredValue(_currentTime);

  const syncTime = useCallback(async () => {
    if (!comms) return;
    const timeMs = await comms.request<GetTimeRequest>(
      {
        type: "get-time",
      },
      true,
    );
    queueMicrotask(() => {
      setCurrentTime(new Date(timeMs));
    });
  }, [comms]);

  const forwardTime = useCallback(
    async (amount: number | null) => {
      if (!comms) return;
      await comms.request({
        type: "advance-game-time",
        data: { amt: amount },
      });
      syncTime();
    },
    [comms, syncTime],
  );

  useEffect(() => {
    syncTime();

    // Sync every minute
    const intervalId = setInterval(syncTime, 60 * 1000);

    return () => clearInterval(intervalId);
  }, [syncTime]);

  // Advance time locally between syncs
  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentTime((prev) => new Date(prev.getTime() + 1000));
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <Stack gap="xs" p={0}>
      <Text size="sm" fw={500}>
        Current time <TimeValue value={currentTime} format="12h" />
      </Text>

      <Button.Group>
        <Button
          size="xs"
          variant="default"
          onClick={() => forwardTime(60 * 1000)}
        >
          +1 min
        </Button>
        <Button
          size="xs"
          variant="default"
          onClick={() => forwardTime(3600 * 1000)}
        >
          +1 hr
        </Button>
        <Button size="xs" variant="default" onClick={() => forwardTime(null)}>
          Next event
        </Button>
      </Button.Group>
    </Stack>
  );
}
