import RadioCard from "@/components/assetTypes/RadioCard";
import { Button, Modal, Radio, Stack } from "@mantine/core";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import BackgroundUploadOptions from "./BackgroundUploadOptions";
import TilesetUploadOptions from "./TilesetUploadOptions";

type AssetType = "tileset" | "background";

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
  const [assetType, setAssetType] = useState<AssetType | null>(null);
  const [pendingType, setPendingType] = useState<AssetType | null>(null);

  const title =
    assetType === null
      ? t("uploadAssetChooseTypeTitle")
      : assetType === "background"
        ? files.length === 1
          ? t("uploadAssetUploadBackground")
          : t("uploadAssetUploadBackgroundPlural", { count: files.length })
        : t("uploadAssetTilesetUpload");

  const handleClose = () => {
    setAssetType(null);
    setPendingType(null);
    closeModal();
  };

  const handleConfirm = () => {
    if (pendingType) setAssetType(pendingType);
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
      {!assetType ? (
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
            </Stack>
          </Radio.Group>
          <Button onClick={handleConfirm} disabled={!pendingType}>
            {t("uploadAssetChooseTypeContinue")}
          </Button>
        </Stack>
      ) : assetType === "background" ? (
        <BackgroundUploadOptions files={files} closeModal={handleClose} />
      ) : (
        <TilesetUploadOptions files={files} closeModal={handleClose} />
      )}
    </Modal>
  );
}
