import { Modal, Portal } from "@mantine/core";
import TilesetSteps from "./assetTypes/tileset";

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
    <Portal>
      <Modal
        size="lg"
        centered
        opened={opened}
        onClose={() => closeModal()}
        title="Asset upload"
        overlayProps={{
          backgroundOpacity: 0.55,
          blur: 3,
        }}
      >
        {steps}
      </Modal>
    </Portal>
  );
}
