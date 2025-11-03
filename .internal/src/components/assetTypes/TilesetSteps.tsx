import { useAppDispatch } from "@/hooks/redux";
import { actions as uiActions } from "@/slices/ui";
import { uploadTilesetThunk } from "@/thunks/tileset";
import { Button, Group, Radio, Stack, Stepper, Text } from "@mantine/core";
import { FileWithPath } from "@mantine/dropzone";
import { useForm } from "@mantine/form";
import { ReactNode, useCallback, useState } from "react";
import RadioCard from "./RadioCard";

interface StepProps {
  files: FileWithPath[];
  closeModal: () => void;
}

interface FormValues {
  tilesetType: "tileset" | "object" | "tileset-composite";
  npcType: "npc-spritesheet" | "npc-animation";
}

export default function TilesetSteps({ files, closeModal }: StepProps) {
  const [step, setStep] = useState(0);
  const dispatch = useAppDispatch();

  const form = useForm<FormValues>({
    name: "tile-asset-type",
    mode: "uncontrolled",
    onSubmitPreventDefault: "always",
    initialValues: {
      tilesetType: "tileset",
      npcType: "npc-spritesheet",
    },
  });

  const uploadTileset = useCallback(
    async (files: FileWithPath[]) => {
      if (!files.length) return;
      for (const file of files) {
        dispatch(uploadTilesetThunk(file));
      }
    },
    [dispatch]
  );

  const formSubmit = form.onSubmit((values) => {
    closeModal();

    if (values.tilesetType === "tileset") {
      uploadTileset(files);
      dispatch(uiActions.setTab("tileset-editor"));
    }
  });

  const values = form.getValues();

  // Build steps array preserving conditional inclusion logic
  const steps: ReactNode[] = [];

  if (values.tilesetType === "tileset") {
    if (files.length === 1) {
      steps.push(
        <Stepper.Step label="Tileset type" key="step-tileset-single">
          <Stack>
            <Text>What type of tileset is this?</Text>
            <Radio.Group
              {...form.getInputProps("tilesetType")}
              key={form.key("tilesetType")}
            >
              <Stack>
                <RadioCard
                  value="tileset"
                  label="Single tileset"
                  description="The image is a single tileset of objects."
                />
                <RadioCard
                  value="object"
                  label="Single object"
                  description="The image is a single object."
                />
              </Stack>
            </Radio.Group>
          </Stack>
        </Stepper.Step>
      );
    } else {
      steps.push(
        <Stepper.Step label="Tileset type" key="step-tileset-multi">
          <Stack>
            <Text>What type of tilesets are these?</Text>
            <Radio.Group
              {...form.getInputProps("tilesetType")}
              key={form.key("tilesetType")}
            >
              <Stack>
                <RadioCard
                  value="tileset"
                  label="Individual tilesets"
                  description="Each image is a separate tileset of objects."
                />
                <RadioCard
                  value="tileset-composite"
                  label="Composite tileset"
                  description="Each image is a separate object and will be combined into a single tileset."
                />
              </Stack>
            </Radio.Group>
          </Stack>
        </Stepper.Step>
      );
    }
  }

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
    <form onSubmit={formSubmit}>
      <Stepper
        size="xs"
        active={step}
        allowNextStepsSelect={false}
        mih={"40vh"}
      >
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
  );
}
