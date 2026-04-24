import { Modal } from "@mantine/core";
import { useTranslation } from "react-i18next";
import BackgroundUploadOptions from "./BackgroundUploadOptions";
import TilesetUploadOptions from "./TilesetUploadOptions";

export interface UploadAssetModalProps {
  files: File[];
  opened: boolean;
  closeModal: () => void;
  /** Controls which upload flow to use. Defaults to "tileset". */
  mode?: "tileset" | "background";
}

export default function UploadAssetModal({
  files,
  opened,
  closeModal,
  mode = "tileset",
}: UploadAssetModalProps) {
  const { t } = useTranslation();
  const title =
    mode === "background"
      ? files.length === 1
        ? t("uploadAssetUploadBackground")
        : t("uploadAssetUploadBackgroundPlural", { count: files.length })
      : t("uploadAssetTilesetUpload");

  return (
    <Modal
      size="lg"
      centered
      opened={opened}
      onClose={closeModal}
      title={title}
      closeOnClickOutside={false}
    >
      {mode === "background" ? (
        <BackgroundUploadOptions files={files} closeModal={closeModal} />
      ) : (
        <TilesetUploadOptions files={files} closeModal={closeModal} />
      )}
    </Modal>
  );
}

