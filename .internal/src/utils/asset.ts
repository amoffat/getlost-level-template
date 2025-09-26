import { AssetType } from "../types/asset";

// Accepted mime types
const IMAGE_MIMES = new Set(["image/png"]);

const SOUND_MIMES = new Set([
  // Explicitly list common encodings/extensions for the requested formats
  "audio/ogg",
  "audio/wav",
  // Some browsers / encoders may use alternate wav identifiers
  "audio/x-wav",
  // m4a is commonly reported as one of these
  "audio/m4a",
  "audio/x-m4a",
  // Safari / others often label m4a (AAC) as mp4
  "audio/mp4",
]);

function classifyMime(mime: string): AssetType | null {
  if (IMAGE_MIMES.has(mime)) return "image";
  if (SOUND_MIMES.has(mime)) return "sound";
  return null;
}

/**
 * Determine whether all provided files are images or sounds.
 *
 * Rules:
 *  - Allowed image mime types: png (image/png)
 *  - Allowed sound mime types: ogg (audio/ogg), wav (audio/wav, audio/x-wav), m4a (audio/m4a, audio/x-m4a, audio/mp4)
 *  - All files must be recognized AND belong to the same asset class (all images or all sounds)
 *  - Any violation throws an Error with a descriptive message
 *
 * @param files Array of File objects (must be non-empty)
 * @returns AssetType ("image" | "sound")
 * @throws Error if files array is empty, contains unknown mime types, or mixed classes
 */
export function determineAssetType(files: File[]): AssetType {
  if (!files || files.length === 0) {
    throw new Error("No files provided");
  }

  // Track first classification
  let expectedType: AssetType | null = null;
  const unknownMimes: Set<string> = new Set();
  const classesEncountered: Set<AssetType> = new Set();

  for (const file of files) {
    // file.type should be the mime; fallback to empty string if missing
    const mime = (file as any).type || ""; // cast to any for environments without full DOM lib
    const cls = classifyMime(mime);
    if (!cls) {
      unknownMimes.add(mime || "<missing>");
      continue;
    }
    classesEncountered.add(cls);
    if (!expectedType) {
      expectedType = cls;
    } else if (expectedType !== cls) {
      // Mixed classes: early break with informative error
      throw new Error(
        `Mixed asset classes detected: encountered both "${expectedType}" and "${cls}" (mime: ${mime})`
      );
    }
  }

  if (unknownMimes.size > 0) {
    throw new Error(
      `Unrecognized or unsupported mime types: ${Array.from(unknownMimes).join(", ")}. ` +
        `Allowed image: ${Array.from(IMAGE_MIMES).join(", ")}. ` +
        `Allowed sound: ${Array.from(SOUND_MIMES).join(", ")}`
    );
  }

  if (classesEncountered.size !== 1 || !expectedType) {
    throw new Error(
      "Unable to determine a single asset class for provided files"
    );
  }

  return expectedType;
}

// Optionally expose the accepted mime sets for external validation / UI (not required by user request)
export const ACCEPTED_IMAGE_MIMES = IMAGE_MIMES;
export const ACCEPTED_SOUND_MIMES = SOUND_MIMES;
