"use client";

import { useEffect } from "react";
import type mapboxgl from "mapbox-gl";
import { useAppStore } from "@/store/useAppStore";

export function useBuildingOpacity(
  mapRef: React.RefObject<mapboxgl.Map | null>
) {
  const buildingOpacity = useAppStore((s) => s.buildingOpacity);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const apply = () => {
      if (map.getLayer("3d-buildings")) {
        map.setPaintProperty(
          "3d-buildings",
          "fill-extrusion-opacity",
          buildingOpacity
        );
      }
    };

    if (map.isStyleLoaded()) {
      apply();
    } else {
      map.once("style.load", apply);
    }
  }, [mapRef, buildingOpacity]);
}
