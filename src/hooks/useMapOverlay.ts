"use client";

import { useEffect, useRef } from "react";
import type mapboxgl from "mapbox-gl";
import { useAppStore } from "@/store/useAppStore";
import { getBboxCorners } from "@/lib/geo-utils";

const OVERLAY_SOURCE_ID = "ai-overlay-source";
const OVERLAY_LAYER_ID = "ai-overlay-layer";

export function useMapOverlay(mapRef: React.RefObject<mapboxgl.Map | null>) {
  const generatedVersions = useAppStore((s) => s.generatedVersions);
  const activeVersionIndex = useAppStore((s) => s.activeVersionIndex);
  const overlayOpacity = useAppStore((s) => s.overlayOpacity);
  const boundingBox = useAppStore((s) => s.boundingBox);

  const prevVersionIdRef = useRef<string | null>(null);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || activeVersionIndex < 0 || !boundingBox) {
      if (map?.getLayer(OVERLAY_LAYER_ID)) {
        map.removeLayer(OVERLAY_LAYER_ID);
        map.removeSource(OVERLAY_SOURCE_ID);
      }
      return;
    }

    const version = generatedVersions[activeVersionIndex];
    if (!version) return;

    const url = version.imageUrl;
    if (!url) return;

    const drapeBounds = version.captureBounds ?? boundingBox;
    const corners = getBboxCorners(drapeBounds);

    const apply = () => {
      const source = map.getSource(OVERLAY_SOURCE_ID) as
        | mapboxgl.ImageSource
        | undefined;

      if (source) {
        source.updateImage({ url, coordinates: corners });
      } else {
        map.addSource(OVERLAY_SOURCE_ID, {
          type: "image",
          url,
          coordinates: corners,
        });
        map.addLayer({
          id: OVERLAY_LAYER_ID,
          type: "raster",
          source: OVERLAY_SOURCE_ID,
          paint: {
            "raster-opacity": overlayOpacity,
            "raster-fade-duration": 500,
          },
        });
      }
    };

    prevVersionIdRef.current = version.id;

    if (map.isStyleLoaded()) apply();
    else map.once("style.load", apply);
  }, [mapRef, activeVersionIndex, boundingBox, generatedVersions, overlayOpacity]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer(OVERLAY_LAYER_ID)) return;
    map.setPaintProperty(OVERLAY_LAYER_ID, "raster-opacity", overlayOpacity);
  }, [mapRef, overlayOpacity]);
}
