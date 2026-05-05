import { MapLayerName } from "@/types/layer";
import i18n from "i18next";

export function mapLayerToName(layer: MapLayerName): string {
  switch (layer) {
    case MapLayerName.Ground:
      return i18n.t("groundLayerName");
    case MapLayerName.Exterior:
      return i18n.t("exteriorLayerName");
    case MapLayerName.Zones:
      return i18n.t("zonesLayerName");
    case MapLayerName.Special:
      return i18n.t("specialLayerName");
    case MapLayerName.Background:
      return i18n.t("backgroundLayerName");
  }
}

export function sortOrder(layer: MapLayerName): number {
  switch (layer) {
    case MapLayerName.Ground:
      return 0;
    case MapLayerName.Exterior:
      return 1;
    case MapLayerName.Zones:
      return 2;
    case MapLayerName.Special:
      return 3;
    case MapLayerName.Background:
      return -1;
  }
}
