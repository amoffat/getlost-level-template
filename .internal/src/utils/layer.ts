import { MapLayerName } from "@/types/layer";

export function mapLayerToName(layer: MapLayerName): string {
  switch (layer) {
    case MapLayerName.Ground:
      return "Ground";
    case MapLayerName.Exterior:
      return "Exterior";
    case MapLayerName.Colliders:
      return "Colliders";
    case MapLayerName.Places:
      return "Places";
    default:
      return "Unknown";
  }
}
