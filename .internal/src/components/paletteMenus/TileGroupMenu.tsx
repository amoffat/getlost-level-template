import { TileGroupTemplate } from "@/types/tilegroup";
import { Vector2 } from "@/vec";
import { Menu } from "@mantine/core";
import { IconCopy, IconExternalLink } from "@tabler/icons-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import FloatingMenu from "../FloatingMenu";

interface TileGroupMenuProps {
  pos: Vector2 | null;
  obj: TileGroupTemplate | null;
  closeMenu: () => void;
}

export default function TileGroupMenu({
  pos,
  obj,
  closeMenu,
}: TileGroupMenuProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const onCopyId = useCallback(() => {
    if (!obj) return;
    navigator.clipboard.writeText(obj.id);
    closeMenu();
  }, [obj, closeMenu]);

  const onViewInTileset = useCallback(() => {
    if (!obj) return;
    navigate(`/tilesets/${obj.tilesetId}/objects/${obj.id}`);
    closeMenu();
  }, [obj, navigate, closeMenu]);

  if (!obj) return null;

  return (
    <>
      <FloatingMenu pos={pos} opened={pos !== null} withArrow>
        <Menu.Label>{t("tileGroupMenuLabel")}</Menu.Label>
        <Menu.Item leftSection={<IconCopy size={14} />} onClick={onCopyId}>
          {t("tileGroupMenuCopyId")}
        </Menu.Item>
        <Menu.Item
          leftSection={<IconExternalLink size={14} />}
          onClick={onViewInTileset}
        >
          {t("tileGroupMenuViewInTileset")}
        </Menu.Item>
      </FloatingMenu>
    </>
  );
}
