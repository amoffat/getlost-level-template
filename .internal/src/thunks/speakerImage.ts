import { globals as g } from "@/globals";
import { uploadSpeakerImage } from "@/persist/speakerImage/api";
import { actions as mapActions } from "@/slices/mapEditor";
import { sha1Hash } from "@/utils/hash";
import { createAsyncThunk } from "@reduxjs/toolkit";

/**
 * Uploads a speaker portrait image, stores it at `/level/speakers/{imageId}.png`,
 * and populates the blob-URL cache.
 *
 * If `objId` is provided, also updates that map object's `speakerImageId`.
 * Pass `null` for `objId` when uploading for a per-node override so the
 * object-level property is not modified.
 */
export const uploadSpeakerImageThunk = createAsyncThunk(
  "mapEditor/uploadSpeakerImageThunk",
  async (
    { objId, file }: { objId: string | null; file: File },
    { dispatch },
  ): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const imageId = await sha1Hash(arrayBuffer);

    const objectUrl = URL.createObjectURL(
      new Blob([arrayBuffer], { type: "image/png" }),
    );
    g.speakerImageObjectUrlCache.set(imageId, objectUrl);

    await uploadSpeakerImage({ id: imageId, data: new Uint8Array(arrayBuffer) });

    if (objId) {
      dispatch(
        mapActions.updateOne({
          id: objId,
          changes: { speakerImageId: imageId } as any,
        }),
      );
    }

    return imageId;
  },
);
