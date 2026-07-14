export enum MapLayerName {
  Ground,
  Exterior,
}

export type PlacableLayer = MapLayerName.Ground | MapLayerName.Exterior;
