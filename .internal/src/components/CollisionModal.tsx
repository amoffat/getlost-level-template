import { overlayProps } from "@/constants";
import { init } from "@/editor/collision/init";
import { Button, Group, Modal, Stack, Stepper, Text } from "@mantine/core";
import { useForm } from "@mantine/form";
import * as P from "pixi.js";
import { ReactNode, useLayoutEffect, useRef, useState } from "react";

interface CollisionModalProps {
  opened: boolean;
  closeModal: () => void;
}

interface FormValues {
  assetType: "tileset" | "npc";
  tilesetType: "tileset" | "object" | "tileset-composite";
  npcType: "npc-spritesheet" | "npc-animation";
}

export default function CollisionModal({
  opened,
  closeModal,
}: CollisionModalProps) {
  const [step, setStep] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedApp = useRef<P.Application>(null);

  useLayoutEffect(() => {
    let cancelled = false;

    const setup = async () => {
      // Only initialize when the modal is open
      if (!opened) return;

      // Wait until the container div is actually mounted
      const container = containerRef.current;
      if (!container) {
        // Try again on the next animation frame
        requestAnimationFrame(setup);
        return;
      }

      let app = initializedApp.current;
      if (!app) {
        app = await init();
      }
      if (cancelled) return;

      const canvas = app.canvas;
      app.resizeTo = container;
      if (!container.contains(canvas)) {
        container.appendChild(canvas);
      }
    };

    if (step === 0) {
      setup();
    }

    return () => {
      cancelled = true;
    };
  }, [opened, step]);

  const form = useForm<FormValues>({
    name: "tile-asset-type",
    mode: "uncontrolled",
    onSubmitPreventDefault: "always",
    initialValues: {
      assetType: "tileset",
      tilesetType: "tileset",
      npcType: "npc-spritesheet",
    },
  });

  // Build steps array preserving conditional inclusion logic
  const steps: ReactNode[] = [
    <Stepper.Step label="Paint footprint" key="1">
      <Stack>
        <Text>
          Use your mouse to paint the footprint of the collider. Left click to
          paint, right click to erase.
        </Text>
        <div
          ref={containerRef}
          style={{ height: "40vh", width: "100%", overflow: "hidden" }}
        ></div>
      </Stack>
    </Stepper.Step>,

    <Stepper.Step label="Make shapes" key="2">
      <Stack>
        <Text>
          Use the eraser tool to remove any excess footprint or the paint tool
          to add more footprint.
        </Text>
      </Stack>
    </Stepper.Step>,
  ];

  const formSubmit = form.onSubmit(() => {
    closeModal();
  });

  const actionButton =
    step === steps.length - 1 ? (
      <Button color="blue" type="submit" radius="md">
        Submit
      </Button>
    ) : (
      <Button
        color="blue"
        type="button"
        radius="md"
        onClick={(e) => {
          e.preventDefault();
          setStep((s) => s + 1);
        }}
      >
        Next
      </Button>
    );

  return (
    <Modal
      size="lg"
      centered
      opened={opened}
      onClose={() => closeModal()}
      title="Colliders"
      overlayProps={overlayProps}
    >
      <form onSubmit={formSubmit}>
        <Stepper active={step} allowNextStepsSelect={false}>
          {steps}
          <Stepper.Completed>
            Completed, click back button to get to previous step
          </Stepper.Completed>
        </Stepper>

        <Group mt="lg" justify="flex-end">
          <Button
            variant="default"
            type="button"
            radius="md"
            disabled={step === 0}
            onClick={() => setStep((s) => s - 1)}
          >
            Back
          </Button>

          {actionButton}
        </Group>
      </form>
    </Modal>
  );
}
