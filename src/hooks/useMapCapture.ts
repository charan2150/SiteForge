"use client";

import { useCallback } from "react";
import type mapboxgl from "mapbox-gl";
import { useAppStore } from "@/store/useAppStore";
import {
  generateMaskFromPolygon,
  generateMaskFromLine,
  captureMapCanvas,
} from "@/lib/mask-utils";

export function useMapCapture(mapRef: React.RefObject<mapboxgl.Map | null>) {
  const drawnCoordinates = useAppStore((s) => s.drawnCoordinates);
  const drawnGeometryType = useAppStore((s) => s.drawnGeometryType);

  const capture = useCallback(async () => {
    const map = mapRef.current;
    if (!map || !drawnCoordinates) return null;

    const mapImage = captureMapCanvas(map);

    let maskImage: string;
    if (drawnGeometryType === "polygon") {
      maskImage = generateMaskFromPolygon(map, drawnCoordinates);
    } else {
      maskImage = generateMaskFromLine(map, drawnCoordinates);
    }

    return { mapImage, maskImage };
  }, [mapRef, drawnCoordinates, drawnGeometryType]);

  return { capture };
}
