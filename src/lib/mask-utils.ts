import type mapboxgl from "mapbox-gl";
import { getDrawInstance } from "@/lib/map-refs";

/**
 * Ideogram v2 mask convention:
 *   BLACK pixels = area to INPAINT (replace with new content)
 *   WHITE pixels = area to PRESERVE (keep original)
 */

/**
 * Generate mask from polygon coordinates for Ideogram inpainting.
 * Renders at the full WebGL backing-store resolution for maximum detail.
 */
export function generateMaskFromPolygon(
  map: mapboxgl.Map,
  coordinates: number[][]
): string {
  const glCanvas = map.getCanvas();
  const width = glCanvas.width;
  const height = glCanvas.height;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  const dpr = window.devicePixelRatio || 1;

  ctx.fillStyle = "#000000";
  ctx.beginPath();
  coordinates.forEach((coord, i) => {
    const point = map.project([coord[0], coord[1]]);
    const px = point.x * dpr;
    const py = point.y * dpr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
  ctx.fill();

  return canvas.toDataURL("image/png");
}

/**
 * Generate mask for a line corridor for Ideogram inpainting.
 * Renders at the full WebGL backing-store resolution.
 */
export function generateMaskFromLine(
  map: mapboxgl.Map,
  coordinates: number[][],
  lineWidthPx: number = 60
): string {
  const glCanvas = map.getCanvas();
  const width = glCanvas.width;
  const height = glCanvas.height;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  const dpr = window.devicePixelRatio || 1;

  ctx.strokeStyle = "#000000";
  ctx.lineWidth = lineWidthPx * dpr;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.beginPath();
  coordinates.forEach((coord, i) => {
    const point = map.project([coord[0], coord[1]]);
    const px = point.x * dpr;
    const py = point.y * dpr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.stroke();

  return canvas.toDataURL("image/png");
}

/**
 * Capture the map canvas at its full backing-store resolution (HiDPI aware).
 */
export function captureMapCanvas(map: mapboxgl.Map): string {
  const glCanvas = map.getCanvas();
  return glCanvas.toDataURL("image/png");
}

/**
 * Capture the map view around an expanded bbox (surroundings), then restore the previous view.
 * Returns a data URL of the context image for use in describing "what's around the site".
 */
export async function captureContextImage(
  map: mapboxgl.Map,
  bbox: [number, number, number, number],
  paddingFactor: number = 0.25
): Promise<string> {
  const center = map.getCenter();
  const zoom = map.getZoom();
  const bearing = map.getBearing();
  const pitch = map.getPitch();

  const [west, south, east, north] = bbox;
  const w = (east - west) * paddingFactor;
  const h = (north - south) * paddingFactor;
  const expanded: [mapboxgl.LngLatLike, mapboxgl.LngLatLike] = [
    [west - w, south - h],
    [east + w, north + h],
  ];

  map.fitBounds(expanded, { duration: 0, padding: 40 });
  await new Promise((r) => setTimeout(r, 700));

  const dataUrl = map.getCanvas().toDataURL("image/png");

  map.setCenter(center);
  map.setZoom(zoom);
  map.setBearing(bearing);
  map.setPitch(pitch);

  return dataUrl;
}

export interface SiteScreenshotResult {
  dataUrl: string;
  captureBounds: [number, number, number, number]; // [west, south, east, north]
}

/**
 * Capture the current map view for Gemini image editing (no zoom/pan).
 * Draws a bright red polygon outline on the screenshot so Gemini knows exactly where to edit.
 * Returns the image AND the actual geographic bounds that were visible.
 *
 * FIX: We no longer call fitBounds during capture — that caused a bounds mismatch
 * (getBounds() returning a larger extent than paddedBbox) and a visible zoom glitch.
 * Capturing the current view guarantees perfect alignment between capture and overlay.
 */
export async function captureSiteScreenshot(
  map: mapboxgl.Map,
  bbox: [number, number, number, number],
  polygonCoordinates?: number[][]
): Promise<SiteScreenshotResult> {
  const center = map.getCenter();
  const zoom = map.getZoom();
  const bearing = map.getBearing();
  const pitch = map.getPitch();

  const [west, south, east, north] = bbox;
  const pad = 0.3;
  const w = (east - west) * pad;
  const h = (north - south) * pad;
  const padded: [number, number, number, number] = [
    west - w,
    south - h,
    east + w,
    north + h,
  ];

  // Only fitBounds if the polygon itself would be clipped. Using polygon bbox (not padded)
  // so we capture current view more often — avoiding fitBounds prevents bounds mismatch
  // and overlay shift (fitBounds expands to viewport aspect, making captureBounds > paddedBbox).
  const currentBounds = map.getBounds();
  const polygonInView =
    currentBounds &&
    west >= currentBounds.getWest() &&
    east <= currentBounds.getEast() &&
    south >= currentBounds.getSouth() &&
    north <= currentBounds.getNorth();

  if (!polygonInView) {
    map.setBearing(0);
    map.setPitch(0);
    map.fitBounds(
      [
        [padded[0], padded[1]],
        [padded[2], padded[3]],
      ] as [mapboxgl.LngLatLike, mapboxgl.LngLatLike],
      { duration: 0, padding: 20 }
    );
    await new Promise<void>((resolve) => {
      const onMoveEnd = () => resolve();
      map.once("moveend", onMoveEnd);
      setTimeout(() => {
        map.off("moveend", onMoveEnd);
        resolve();
      }, 3000);
    });
    await new Promise((r) => setTimeout(r, 400));
  }

  const draw = getDrawInstance();
  let savedDrawData: GeoJSON.FeatureCollection | null = null;
  if (draw && polygonCoordinates && polygonCoordinates.length >= 3) {
    savedDrawData = draw.getAll();
    draw.deleteAll();
    // Wait for map to finish rendering after layer removal (idle fires when render completes)
    await new Promise<void>((resolve) => {
      map.once("idle", () => resolve());
      setTimeout(resolve, 2000);
    });
    await new Promise((r) => setTimeout(r, 300));
  }

  // Ensure map has no pending paints before reading bounds and capturing
  await new Promise<void>((resolve) => {
    map.once("idle", () => resolve());
    setTimeout(resolve, 500);
  });

  const actualBounds = map.getBounds();
  if (!actualBounds) {
    throw new Error("Map bounds unavailable for capture");
  }
  const captureBounds: [number, number, number, number] = [
    actualBounds.getWest(),
    actualBounds.getSouth(),
    actualBounds.getEast(),
    actualBounds.getNorth(),
  ];

  const mapCanvas = map.getCanvas();

  const MAX_DIM = 1536;
  let { width, height } = mapCanvas;
  const scaleFactor =
    width > MAX_DIM || height > MAX_DIM
      ? MAX_DIM / Math.max(width, height)
      : 1;
  width = Math.round(width * scaleFactor);
  height = Math.round(height * scaleFactor);

  const resizeCanvas = document.createElement("canvas");
  resizeCanvas.width = width;
  resizeCanvas.height = height;
  const ctx = resizeCanvas.getContext("2d")!;
  ctx.drawImage(mapCanvas, 0, 0, width, height);

  if (polygonCoordinates && polygonCoordinates.length >= 3) {
    // Mapbox project() returns container (logical) pixels. Canvas may be device-scaled.
    // Use actual canvas/container ratio for correct polygon placement on the capture.
    const container = map.getContainer();
    const cw = container.clientWidth || 1;
    const ch = container.clientHeight || 1;
    const scaleX = mapCanvas.width / cw;
    const scaleY = mapCanvas.height / ch;
    const points = polygonCoordinates.map((coord) => {
      const point = map.project([coord[0], coord[1]]);
      return [
        (point.x * scaleX) * scaleFactor,
        (point.y * scaleY) * scaleFactor,
      ] as [number, number];
    });

    const tracePath = () => {
      ctx.beginPath();
      points.forEach(([px, py], i) => {
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
    };

    tracePath();
    ctx.fillStyle = "rgba(255, 0, 0, 0.15)";
    ctx.fill();

    tracePath();
    ctx.strokeStyle = "#FF0000";
    ctx.lineWidth = 4;
    ctx.setLineDash([]);
    ctx.stroke();
  }

  if (draw && savedDrawData && savedDrawData.features.length > 0) {
    draw.add(savedDrawData);
  }

  if (!polygonInView) {
    map.setCenter(center);
    map.setZoom(zoom);
    map.setBearing(bearing);
    map.setPitch(pitch);
  }

  const dataUrl = resizeCanvas.toDataURL("image/jpeg", 0.85);

  return {
    dataUrl,
    captureBounds,
  };
}
