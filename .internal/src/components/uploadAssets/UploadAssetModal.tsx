import RadioCard from "@/components/assetTypes/RadioCard";
import { Button, Modal, Radio, Stack } from "@mantine/core";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import AudioUploadOptions from "./AudioUploadOptions";
import BackgroundUploadOptions from "./BackgroundUploadOptions";
import TilesetUploadOptions from "./TilesetUploadOptions";

type AssetType = "tileset" | "background" | "audio";

const AUDIO_MIME_TYPES = new Set([
  "audio/ogg",
  "audio/mp4",
  "audio/wav",
  "audio/mpeg",
  "audio/x-wav",
  "audio/mp3",
]);

function detectAssetType(files: File[]): AssetType | null {
  if (!files.length) return null;
  const allAudio = files.every((f) => AUDIO_MIME_TYPES.has(f.type));
  return allAudio ? "audio" : null;
}

export interface UploadAssetModalProps {
  files: File[];
  opened: boolean;
  closeModal: () => void;
}

export default function UploadAssetModal({
  files,
  opened,
  closeModal,
}: UploadAssetModalProps) {
  const { t } = useTranslation();
  // manualType holds an explicit user selection; detectedType is auto-derived
  const [manualType, setManualType] = useState<AssetType | null>(null);
  const [pendingType, setPendingType] = useState<AssetType | null>(null);

  const detectedType = useMemo(() => detectAssetType(files), [files]);
  // Auto-detected type wins unless the user has made a manual selection
  const assetType = manualType ?? detectedType;

  const title =
    assetType === null
      ? t("uploadAssetChooseTypeTitle")
      : assetType === "background"
        ? files.length === 1
          ? t("uploadAssetUploadBackground")
          : t("uploadAssetUploadBackgroundPlural", { count: files.length })
        : assetType === "tileset"
          ? t("uploadAssetTilesetUpload")
          : t("uploadAssetAudioUpload");

  const handleClose = () => {
    setManualType(null);
    setPendingType(null);
    closeModal();
  };

  const handleConfirm = () => {
    if (pendingType) setManualType(pendingType);
  };

  const renderFlow = () => {
    if (assetType === "background") {
      return <BackgroundUploadOptions files={files} closeModal={handleClose} />;
    }
    if (assetType === "tileset") {
      return <TilesetUploadOptions files={files} closeModal={handleClose} />;
    }
    if (assetType === "audio") {
      return <AudioUploadOptions files={files} closeModal={handleClose} />;
    }
    return (
      <Stack>
        <Radio.Group
          value={pendingType ?? ""}
          onChange={(v) => setPendingType(v as AssetType)}
        >
          <Stack gap="xs">
            <RadioCard
              value="background"
              label={t("uploadAssetChooseTypeBackground")}
              description={t("uploadAssetChooseTypeBackgroundDesc")}
            />
            <RadioCard
              value="tileset"
              label={t("uploadAssetChooseTypeTileset")}
              description={t("uploadAssetChooseTypeTilesetDesc")}
            />
            <RadioCard
              value="audio"
              label={t("uploadAssetChooseTypeAudio")}
              description={t("uploadAssetChooseTypeAudioDesc")}
            />
          </Stack>
        </Radio.Group>
        <Button onClick={handleConfirm} disabled={!pendingType}>
          {t("uploadAssetChooseTypeContinue")}
        </Button>
      </Stack>
    );
  };

  return (
    <Modal
      size="lg"
      centered
      opened={opened}
      onClose={handleClose}
      title={title}
      closeOnClickOutside={false}
    >
      {renderFlow()}
    </Modal>
  );
}
