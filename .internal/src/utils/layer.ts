import { MapLayerName } from "@/types/layer";

export function mapLayerToName(layer: MapLayerName): string {
  switch (layer) {
    case MapLayerName.Ground:
      return "Ground";
    case MapLayerName.Exterior:
      return "Exterior";
    case MapLayerName.Sensors:
      return "Sensors";
    case MapLayerName.Special:
      return "Special";
    case MapLayerName.Background:
      return "Background";
    default:
      return "Unknown";
  }
}
