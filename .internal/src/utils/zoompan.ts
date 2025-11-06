import { ZoomPan } from "@/types/zoompan";

/**
 * Calculate default zoom and pan values to fit an object within a container
 * while maintaining aspect ratio (object-fit: contain) and centering it.
 *
 * @param cWidth - Container width
 * @param cHeight - Container height
 * @param oWidth - Object width
 * @param oHeight - Object height
 * @param paddingPercent - Optional padding as a percentage of container height (0-1)
 * @returns ZoomPan object with zoom and pan values
 */
export function calcDefaultZoomPan(
  cWidth: number,
  cHeight: number,
  oWidth: number,
  oHeight: number,
  paddingPercent: number = 0.05
): ZoomPan {
  // Calculate effective container size after padding
  const padding = cHeight * paddingPercent;
  const effectiveWidth = cWidth - padding * 2;
  const effectiveHeight = cHeight - padding * 2;

  // Calculate scale factors for both dimensions
  const scaleX = effectiveWidth / oWidth;
  const scaleY = effectiveHeight / oHeight;

  // Use the smaller scale to ensure the object fits completely (contain behavior)
  const zoom = Math.min(scaleX, scaleY);

  // Calculate the scaled object dimensions
  const scaledWidth = oWidth * zoom;
  const scaledHeight = oHeight * zoom;

  // Calculate pan to center the object in the container
  // Pan represents the offset from the origin, so we calculate the center position
  const panX = (cWidth - scaledWidth) / 2;
  const panY = (cHeight - scaledHeight) / 2;

  return {
    zoom,
    pan: { x: panX, y: panY },
  };
}
