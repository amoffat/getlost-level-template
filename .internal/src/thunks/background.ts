import { batchUploadBackgroundImages } from "@/persist/background/api";
import { globals as g } from "@/globals";
import { actions as mapActions } from "@/slices/mapEditor";
import { MapLayerName } from "@/types/layer";
import { MapObjType } from "@/types/map";
import { sha1Hash } from "@/utils/hash";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { RootState } from "@/store/store";
import * as P from "pixi.js";

export const uploadBackgroundImageThunk = createAsyncThunk(
  "mapEditor/uploadBackgroundImageThunk",
  async (
    { files, restricted = false }: { files: File[]; restricted?: boolean },
    { dispatch, getState },
  ) => {
    if (!files.length) return;

    // Process all files: hash, objectUrl, cache population
    const items: { id: string; imageId: string; data: Uint8Array; objectUrl: string; restricted: boolean }[] =
      await Promise.all(
        files.map(async (file) => {
          const arrayBuffer = await file.arrayBuffer();
          const imageId = await sha1Hash(arrayBuffer);
          const objectUrl = URL.createObjectURL(
            new Blob([arrayBuffer], { type: "image/png" }),
          );
          return { id: crypto.randomUUID(), imageId, data: new Uint8Array(arrayBuffer), objectUrl, restricted };
        }),
      );

    // Populate texture caches for all unique imageIds before dispatching
    await Promise.all(
      items
        .filter(({ imageId }) => !g.backgroundImageCache.has(imageId))
        .map(async ({ imageId, objectUrl }) => {
          const tex = await P.Assets.load<P.Texture>({
            src: objectUrl,
            loadParser: "loadTextures",
          });
          const canvas = new P.CanvasSource({
            width: tex.source.width,
            height: tex.source.height,
          });
          canvas.context2D.drawImage(
            (tex.source as any).resource as CanvasImageSource,
            0,
            0,
          );
          canvas.update();
          g.backgroundImageCache.set(imageId, canvas);
        }),
    );
    for (const { imageId, objectUrl } of items) {
      g.backgroundImageObjectUrlCache.set(imageId, objectUrl);
    }

    // Batch-upload all unique images to the server in one request
    const uniqueImages = Array.from(
      new Map(items.map(({ imageId, data, restricted: r }) => [imageId, { data, restricted: r }])).entries(),
    ).map(([id, { data, restricted: r }]) => ({ id, data, restricted: r }));
    await batchUploadBackgroundImages(uniqueImages);

    const state = getState() as RootState;
    const bounds = state.mapEditor.bounds;
    const mapCenterX = bounds.x + bounds.width / 2;
    const mapCenterY = bounds.y + bounds.height / 2;

    const bgObjs = Object.values(state.mapEditor.objects.entities).filter(
      (o) => o?.type === MapObjType.BackgroundImage,
    );
    let minZ =
      bgObjs.length > 0
        ? Math.min(...bgObjs.map((o) => (o as any).z ?? 0))
        : 0;

    for (const { id, imageId } of items) {
      const canvas = g.backgroundImageCache.get(imageId)!;
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      dispatch(
        mapActions.addOne({
          id,
          type: MapObjType.BackgroundImage,
          imageId,
          x: Math.round(mapCenterX - imgWidth / 2),
          y: Math.round(mapCenterY - imgHeight / 2),
          z: --minZ,
          layer: MapLayerName.Background,
          width: imgWidth,
          height: imgHeight,
          parallax: { x: 1, y: 1 },
        }),
      );
    }
  },
);

