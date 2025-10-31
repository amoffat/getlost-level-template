import { useAppDispatch } from "@/hooks/redux";
import { actions as uiActions } from "@/slices/ui";
import { uploadTilesetThunk } from "@/thunks/tileset";
import { Button, Group, Radio, Stack, Stepper, Text } from "@mantine/core";
import { FileWithPath } from "@mantine/dropzone";
import { useForm } from "@mantine/form";
import { ReactNode, useCallback, useState } from "react";
import NpcCreateOrSelect from "../NpcCreateOrSelect";
import RadioCard from "./RadioCard";

interface StepProps {
  files: FileWithPath[];
  closeModal: () => void;
}

interface FormValues {
  assetType: "tileset" | "npc";
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
      assetType: "tileset",
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

    if (values.assetType === "tileset") {
      uploadTileset(files);
      dispatch(uiActions.setTab("tileset-editor"));
    }
  });

  const values = form.getValues();

  // Build steps array preserving conditional inclusion logic
  const steps: ReactNode[] = [];

  if (files.length === 1) {
    steps.push(
      <Stepper.Step label="Asset type" key="step-asset-type">
        <Stack>
          <Text>Are you uploading a tileset asset or an NPC asset?</Text>
          <Radio.Group
            {...form.getInputProps("assetType")}
            key={form.key("assetType")}
          >
            <Stack>
              <RadioCard
                value="tileset"
                label="Tileset"
                description="A spritesheet containing tiles or objects to be used in the map editor."
              />
              <RadioCard
                value="npc"
                label="NPC"
                description="A single NPC animation frame or a spritesheet containing NPC frames."
              />
            </Stack>
          </Radio.Group>
        </Stack>
      </Stepper.Step>
    );
  } else {
    steps.push(
      <Stepper.Step label="Asset type" key="step-asset-type">
        <Stack>
          <Text>Are you uploading tileset assets or NPC assets?</Text>
          <Radio.Group
            {...form.getInputProps("assetType")}
            key={form.key("assetType")}
          >
            <Stack>
              <RadioCard
                value="tileset"
                label="Tileset"
                description="Images containing tilesets or objects to be used in the map editor."
              />
              <RadioCard
                value="npc"
                label="NPC"
                description="Images containing NPC spritesheets or animation frames."
              />
            </Stack>
          </Radio.Group>
        </Stack>
      </Stepper.Step>
    );
  }

  if (values.assetType === "tileset") {
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

  if (values.assetType === "npc") {
    if (files.length === 1) {
      steps.push(
        <Stepper.Step label="NPC type" key="step-npc-single">
          <Stack>
            <Text>What type of NPC asset is this?</Text>
            <Radio.Group
              {...form.getInputProps("npcType")}
              key={form.key("npcType")}
            >
              <Stack>
                <RadioCard
                  value="npc-spritesheet"
                  label="NPC animation spritesheet"
                  description="The image is a spritesheet of NPC animation frames."
                />
                <RadioCard
                  value="npc-animation"
                  label="NPC animation frame"
                  description="The image is a single frame in an NPC animation."
                />
              </Stack>
            </Radio.Group>
          </Stack>
        </Stepper.Step>
      );
    } else {
      steps.push(
        <Stepper.Step label="NPC type" key="step-npc-multi">
          <Stack>
            <Text>What type of NPC assets are these?</Text>
            <Radio.Group
              {...form.getInputProps("npcType")}
              key={form.key("npcType")}
            >
              <Stack>
                <RadioCard
                  value="npc-spritesheet"
                  label="NPC spritesheets"
                  description="Each image is a separate NPC spritesheet of animations."
                />
                <RadioCard
                  value="npc-animation"
                  label="NPC animation frames"
                  description="Each image is a separate animation frame in a single NPC animation."
                />
              </Stack>
            </Radio.Group>
          </Stack>
        </Stepper.Step>
      );
    }

    steps.push(
      <Stepper.Step label="NPC configuration" key="step-npc-config">
        <Stack>
          <Text>
            Please create or select the NPC that these assets will be associated
            with.
          </Text>
          <NpcCreateOrSelect />
        </Stack>
      </Stepper.Step>
    );
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
