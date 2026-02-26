import type { BoundingBox } from "@/types";

const FEATHER_PX = 60;
const POLYGON_INSET = 0.0;
const OVERLAY_SIZE = 2048;

function lngLatToPixel(
  lng: number,
  lat: number,
  bbox: BoundingBox,
  width: number,
  height: number
): [number, number] {
  const [west, south, east, north] = bbox;
  const x = ((lng - west) / (east - west)) * width;
  const y = ((north - lat) / (north - south)) * height;
  return [x, y];
}

function insetPolygon(
  coords: number[][],
  bbox: BoundingBox,
  width: number,
  height: number,
  factor: number
): [number, number][] {
  if (factor <= 0 || coords.length < 3) {
    return coords.map((c) => lngLatToPixel(c[0], c[1], bbox, width, height));
  }
  const pixels = coords.map((c) =>
    lngLatToPixel(c[0], c[1], bbox, width, height)
  );
  const cx = pixels.reduce((s, p) => s + p[0], 0) / pixels.length;
  const cy = pixels.reduce((s, p) => s + p[1], 0) / pixels.length;
  return pixels.map(([px, py]) => [
    px + (cx - px) * factor,
    py + (cy - py) * factor,
  ]);
}

/**
 * Create a geo-referenced overlay: generated content inside the polygon with
 * feathered edges. The canvas matches the bbox aspect ratio so Mapbox drapes
 * it without distortion.
 */
export function createBlendedOverlay(
  generatedImageUrl: string,
  bbox: BoundingBox,
  polygonCoordinates: number[][],
  featherPixels: number = FEATHER_PX
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const [west, south, east, north] = bbox;
        const aspect = (east - west) / (north - south);
        const width =
          aspect >= 1 ? OVERLAY_SIZE : Math.round(OVERLAY_SIZE * aspect);
        const height =
          aspect >= 1 ? Math.round(OVERLAY_SIZE / aspect) : OVERLAY_SIZE;

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;

        ctx.drawImage(img, 0, 0, width, height);

        // Polygon mask with feathered edges
        const maskCanvas = document.createElement("canvas");
        maskCanvas.width = width;
        maskCanvas.height = height;
        const maskCtx = maskCanvas.getContext("2d")!;

        const insetPixels = insetPolygon(
          polygonCoordinates,
          bbox,
          width,
          height,
          POLYGON_INSET
        );

        maskCtx.fillStyle = "white";
        maskCtx.beginPath();
        insetPixels.forEach(([px, py], i) => {
          if (i === 0) maskCtx.moveTo(px, py);
          else maskCtx.lineTo(px, py);
        });
        maskCtx.closePath();
        maskCtx.fill();

        const scaledFeather = Math.round(featherPixels * (width / 1024));

        const maskBlurred = document.createElement("canvas");
        maskBlurred.width = width;
        maskBlurred.height = height;
        const maskBlurredCtx = maskBlurred.getContext("2d")!;
        maskBlurredCtx.filter = `blur(${scaledFeather}px)`;
        maskBlurredCtx.drawImage(maskCanvas, 0, 0);

        ctx.globalCompositeOperation = "destination-in";
        ctx.drawImage(maskBlurred, 0, 0);

        resolve(canvas.toDataURL("image/png"));
      } catch (e) {
        reject(e);
      }
    };

    img.onerror = () => reject(new Error("Failed to load generated image"));
    img.src = generatedImageUrl;
  });
}
