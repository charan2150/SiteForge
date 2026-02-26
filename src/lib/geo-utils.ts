import * as turf from "@turf/turf";
import type { BoundingBox } from "@/types";

export function calculateBoundingBox(coordinates: number[][]): BoundingBox {
  const line = turf.lineString(coordinates);
  return turf.bbox(line) as BoundingBox;
}

export function calculatePolygonArea(coordinates: number[][]): string {
  const polygon = turf.polygon([coordinates]);
  const areaM2 = turf.area(polygon);
  const areaAcres = areaM2 / 4046.86;

  if (areaAcres >= 1) {
    return `${areaAcres.toFixed(2)} Acres`;
  }
  if (areaM2 >= 1000) {
    return `${(areaM2 / 1000).toFixed(2)} km²`;
  }
  return `${areaM2.toFixed(0)} m²`;
}

export function calculateLineLength(coordinates: number[][]): string {
  const line = turf.lineString(coordinates);
  const lengthKm = turf.length(line, { units: "kilometers" });

  if (lengthKm >= 1) {
    return `${lengthKm.toFixed(2)} km`;
  }
  return `${(lengthKm * 1000).toFixed(0)} m`;
}

export function getBboxCorners(
  bbox: BoundingBox
): [[number, number], [number, number], [number, number], [number, number]] {
  const [west, south, east, north] = bbox;
  return [
    [west, north], // top-left
    [east, north], // top-right
    [east, south], // bottom-right
    [west, south], // bottom-left
  ];
}

const IDEOGRAM_RATIOS: { label: string; value: number }[] = [
  { label: "1:1", value: 1 },
  { label: "16:9", value: 16 / 9 },
  { label: "9:16", value: 9 / 16 },
  { label: "4:3", value: 4 / 3 },
  { label: "3:4", value: 3 / 4 },
  { label: "3:2", value: 3 / 2 },
  { label: "2:3", value: 2 / 3 },
  { label: "16:10", value: 16 / 10 },
  { label: "10:16", value: 10 / 16 },
  { label: "3:1", value: 3 },
  { label: "1:3", value: 1 / 3 },
];

/**
 * Pick the Ideogram aspect ratio closest to the polygon's bounding box shape.
 * Uses lng/lat span corrected by cos(latitude) for approximate metric ratio.
 */
export function computeAspectRatioFromBbox(bbox: BoundingBox): string {
  const [west, south, east, north] = bbox;
  const midLat = ((north + south) / 2) * (Math.PI / 180);
  const widthDeg = Math.abs(east - west) * Math.cos(midLat);
  const heightDeg = Math.abs(north - south);

  if (heightDeg === 0) return "3:1";
  const actual = widthDeg / heightDeg;

  let best = IDEOGRAM_RATIOS[0];
  let bestDiff = Math.abs(Math.log(actual) - Math.log(best.value));

  for (const r of IDEOGRAM_RATIOS) {
    const diff = Math.abs(Math.log(actual) - Math.log(r.value));
    if (diff < bestDiff) {
      best = r;
      bestDiff = diff;
    }
  }

  return best.label;
}

/**
 * Get the center point of a bounding box as [lng, lat].
 */
export function getBboxCenter(bbox: BoundingBox): [number, number] {
  const [west, south, east, north] = bbox;
  return [(west + east) / 2, (south + north) / 2];
}

/**
 * Expand a bounding box by a factor (e.g. 0.2 = 20% larger on each side).
 */
export function expandBbox(
  bbox: BoundingBox,
  factor: number
): BoundingBox {
  const [west, south, east, north] = bbox;
  const w = (east - west) * factor;
  const h = (north - south) * factor;
  return [
    west - w,
    south - h,
    east + w,
    north + h,
  ];
}

/**
 * Reverse-geocode a [lng, lat] to a human-readable location name
 * using the Mapbox Geocoding API. Returns something like
 * "Bryant Park, Midtown Manhattan, New York City, NY".
 */
export async function reverseGeocode(
  lng: number,
  lat: number
): Promise<string | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return null;

  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=poi,neighborhood,locality,place,district&limit=1&access_token=${token}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.features && data.features.length > 0) {
      return data.features[0].place_name as string;
    }
    return null;
  } catch {
    return null;
  }
}
