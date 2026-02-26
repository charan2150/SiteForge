"use client";

import { useEffect, useRef, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  DEFAULT_MAP_PITCH,
  DEFAULT_MAP_BEARING,
  MAPBOX_STYLE,
} from "@/lib/constants";

export function useMap(containerRef: React.RefObject<HTMLDivElement | null>) {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!containerRef.current || initialized.current) return;
    initialized.current = true;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAPBOX_STYLE,
      center: DEFAULT_MAP_CENTER,
      zoom: DEFAULT_MAP_ZOOM,
      pitch: DEFAULT_MAP_PITCH,
      bearing: DEFAULT_MAP_BEARING,
      antialias: true,
      preserveDrawingBuffer: true,
      dragRotate: true,
      touchZoomRotate: true,
      maxPitch: 85,
    });

    map.addControl(
      new mapboxgl.NavigationControl({ visualizePitch: true }),
      "bottom-right"
    );

    map.on("style.load", () => {
      map.addSource("mapbox-dem", {
        type: "raster-dem",
        url: "mapbox://mapbox.mapbox-terrain-dem-v1",
        tileSize: 512,
        maxzoom: 14,
      });
      map.setTerrain({ source: "mapbox-dem", exaggeration: 1.5 });

      const layers = map.getStyle().layers;
      const labelLayerId = layers?.find(
        (layer) => layer.type === "symbol" && layer.layout?.["text-field"]
      )?.id;

      map.addLayer(
        {
          id: "3d-buildings",
          source: "composite",
          "source-layer": "building",
          filter: ["==", "extrude", "true"],
          type: "fill-extrusion",
          minzoom: 12,
          paint: {
            "fill-extrusion-color": [
              "interpolate",
              ["linear"],
              ["get", "height"],
              0, "#c8cdd3",
              50, "#d8dce2",
              150, "#e8ecf0",
            ],
            "fill-extrusion-height": [
              "interpolate",
              ["linear"],
              ["zoom"],
              12, 0,
              12.5, ["get", "height"],
            ],
            "fill-extrusion-base": [
              "interpolate",
              ["linear"],
              ["zoom"],
              12, 0,
              12.5, ["get", "min_height"],
            ],
            "fill-extrusion-opacity": 0.85,
          },
        },
        labelLayerId
      );
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      initialized.current = false;
    };
  }, [containerRef]);

  const flyTo = useCallback(
    (center: [number, number], zoom?: number) => {
      mapRef.current?.flyTo({
        center,
        zoom: zoom ?? 16,
        pitch: DEFAULT_MAP_PITCH,
        bearing: DEFAULT_MAP_BEARING,
        duration: 2000,
      });
    },
    []
  );

  return { mapRef, flyTo };
}
