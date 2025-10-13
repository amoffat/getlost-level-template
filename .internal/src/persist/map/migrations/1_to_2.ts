import { MapLayerName } from "@/types/layer";
import type { MapDocV1 } from "../schema";

export function migrate(doc: MapDocV1) {
  for (const obj of Object.values(doc.objects.entities)) {
    const oldLayer = obj.layer as unknown as string;
    if (oldLayer === "ground") {
      obj.layer = MapLayerName.Ground;
    } else if (oldLayer === "world") {
      obj.layer = MapLayerName.World;
    }
  }
}
