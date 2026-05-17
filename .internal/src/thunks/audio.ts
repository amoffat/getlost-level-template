import { uploadAudioFile } from "@/persist/audio/api";
import { sha1Hash } from "@/utils/hash";
import { createAsyncThunk } from "@reduxjs/toolkit";

export const uploadAudioThunk = createAsyncThunk(
  "audio/uploadAudioThunk",
  async ({ files, restricted = false }: { files: File[]; restricted?: boolean }) => {
    if (!files.length) return;

    await Promise.all(
      files.map(async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        const id = await sha1Hash(arrayBuffer);

        const lastDot = file.name.lastIndexOf(".");
        const ext = lastDot !== -1 ? file.name.slice(lastDot).toLowerCase() : "";
        const blob = new Blob([arrayBuffer], { type: file.type });

        await uploadAudioFile({ id, ext, blob, restricted });
      }),
    );
  },
);
