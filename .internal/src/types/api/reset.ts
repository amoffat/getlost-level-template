/** Metadata describing what a full level reset would do. Expand as needed. */
export interface ResetInfo {
  /** Number of level asset files a reset would delete (excludes node_modules). */
  assetCount: number;
}
