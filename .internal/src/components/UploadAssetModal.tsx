import { overlayProps } from "@/constants";
import { Modal } from "@mantine/core";
import TilesetSteps from "./assetTypes/TilesetSteps";

interface TileAssetTypeModalProps {
  files: File[];
  opened: boolean;
  closeModal: () => void;
}

export default function UploadAssetModal({
  files,
  opened,
  closeModal,
}: TileAssetTypeModalProps) {
  const steps = <TilesetSteps files={files} closeModal={closeModal} />;

  return (
    <Modal
      size="lg"
      centered
      opened={opened}
      onClose={() => closeModal()}
      title="Asset upload"
      overlayProps={overlayProps}
    >
      {steps}
    </Modal>
  );
}
