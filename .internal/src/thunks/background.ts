import { globals as g } from "@/globals";
import { batchUploadBackgroundImages } from "@/persist/background/api";
import { actions as mapActions } from "@/slices/mapEditor";
import { RootState } from "@/store/store";
import { MapLayerName } from "@/types/layer";
import { MapObjType } from "@/types/map";
import { uuid5Hash } from "@/utils/hash";
import { createAsyncThunk } from "@reduxjs/toolkit";
import * as P from "pixi.js";

export const uploadBackgroundImageThunk = createAsyncThunk(
  "mapEditor/uploadBackgroundImageThunk",
  async (
    { files, restricted = false }: { files: File[]; restricted?: boolean },
    { dispatch, getState },
  ) => {
    if (!files.length) return;

    // Process all files: hash, objectUrl, cache population
    const items: {
      id: string;
      imageId: string;
      blob: Blob;
      objectUrl: string;
      restricted: boolean;
    }[] = await Promise.all(
      files.map(async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        const imageId = uuid5Hash(arrayBuffer);
        const blob = new Blob([arrayBuffer], { type: "image/png" });
        const objectUrl = URL.createObjectURL(blob);
        return {
          id: crypto.randomUUID(),
          imageId,
          blob,
          objectUrl,
          restricted,
        };
      }),
    );

    // Populate texture caches for all unique imageIds before dispatching
    await Promise.all(
      items
        .filter(({ imageId }) => !g.backgroundImageCache.has(imageId))
        .map(async ({ imageId, objectUrl }) => {
          const tex = await P.Assets.load<P.Texture>({
            src: objectUrl,
            parser: "loadTextures",
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
          canvas.scaleMode = "nearest";
          g.backgroundImageCache.set(imageId, canvas);
        }),
    );
    for (const { imageId, objectUrl } of items) {
      g.backgroundImageObjectUrlCache.set(imageId, objectUrl);
    }

    // Batch-upload all unique images to the server in one request
    const uniqueImages = Array.from(
      new Map(
        items.map(({ imageId, blob, restricted: r }) => [
          imageId,
          { blob, restricted: r },
        ]),
      ).entries(),
    ).map(([id, { blob, restricted: r }]) => ({ id, blob, restricted: r }));
    await batchUploadBackgroundImages(uniqueImages);

    const state = getState() as RootState;
    const bounds = state.mapEditor.bounds;
    const mapCenterX = bounds.x + bounds.width / 2;
    const mapCenterY = bounds.y + bounds.height / 2;

    const bgObjs = Object.values(state.mapEditor.objects.entities).filter(
      (o) => o?.type === MapObjType.BackgroundImage,
    );
    let minZ =
      bgObjs.length > 0 ? Math.min(...bgObjs.map((o) => (o as any).z ?? 0)) : 0;

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
          parallaxX: 1,
          parallaxY: 1,
          tileX: false,
          tileY: false,
        }),
      );
    }
  },
);
