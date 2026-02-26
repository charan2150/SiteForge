"use client";

import { useEffect, useRef } from "react";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import type mapboxgl from "mapbox-gl";
import { useAppStore } from "@/store/useAppStore";
import { setDrawInstance } from "@/lib/map-refs";
import {
  calculateBoundingBox,
  calculatePolygonArea,
  calculateLineLength,
} from "@/lib/geo-utils";

export function useMapDraw(mapRef: React.RefObject<mapboxgl.Map | null>) {
  const drawRef = useRef<MapboxDraw | null>(null);
  const activeTool = useAppStore((s) => s.activeTool);
  const setDrawnCoordinates = useAppStore((s) => s.setDrawnCoordinates);
  const setBoundingBox = useAppStore((s) => s.setBoundingBox);
  const setSelectionInfo = useAppStore((s) => s.setSelectionInfo);
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const initDraw = () => {
      if (drawRef.current) return;

      const draw = new MapboxDraw({
        displayControlsDefault: false,
        controls: {},
        defaultMode: "simple_select",
        styles: [
          {
            id: "gl-draw-polygon-fill",
            type: "fill",
            filter: ["all", ["==", "$type", "Polygon"], ["!=", "mode", "static"]],
            paint: {
              "fill-color": "#14b8a6",
              "fill-outline-color": "#14b8a6",
              "fill-opacity": 0.15,
            },
          },
          {
            id: "gl-draw-polygon-stroke-active",
            type: "line",
            filter: ["all", ["==", "$type", "Polygon"], ["!=", "mode", "static"]],
            layout: { "line-cap": "round", "line-join": "round" },
            paint: {
              "line-color": "#14b8a6",
              "line-dasharray": [0.2, 2],
              "line-width": 2,
            },
          },
          {
            id: "gl-draw-line",
            type: "line",
            filter: ["all", ["==", "$type", "LineString"], ["!=", "mode", "static"]],
            layout: { "line-cap": "round", "line-join": "round" },
            paint: { "line-color": "#14b8a6", "line-width": 3 },
          },
          {
            id: "gl-draw-point",
            type: "circle",
            filter: ["all", ["==", "$type", "Point"], ["==", "meta", "vertex"]],
            paint: {
              "circle-radius": 5,
              "circle-color": "#14b8a6",
              "circle-stroke-color": "#fff",
              "circle-stroke-width": 2,
            },
          },
          {
            id: "gl-draw-point-midpoint",
            type: "circle",
            filter: ["all", ["==", "$type", "Point"], ["==", "meta", "midpoint"]],
            paint: {
              "circle-radius": 3,
              "circle-color": "#14b8a6",
            },
          },
        ],
      });

      map.addControl(draw as unknown as mapboxgl.IControl);
      drawRef.current = draw;
      setDrawInstance(draw);

      const handleCreate = (e: { features: GeoJSON.Feature[] }) => {
        const feature = e.features[0];
        if (!feature?.geometry) return;

        const geom = feature.geometry;
        if (geom.type === "Polygon") {
          const coords = geom.coordinates[0];
          setDrawnCoordinates(coords, "polygon");
          setBoundingBox(calculateBoundingBox(coords));
          setSelectionInfo(`Site Area: ${calculatePolygonArea(coords)}`);
          setSidebarOpen(true);
        } else if (geom.type === "LineString") {
          const coords = geom.coordinates;
          setDrawnCoordinates(coords, "line");
          setBoundingBox(calculateBoundingBox(coords));
          setSelectionInfo(`Corridor Length: ${calculateLineLength(coords)}`);
          setSidebarOpen(true);
        }
      };

      const handleUpdate = (e: { features: GeoJSON.Feature[] }) => {
        handleCreate(e);
      };

      map.on("draw.create", handleCreate);
      map.on("draw.update", handleUpdate);
    };

    if (map.isStyleLoaded()) {
      initDraw();
    } else {
      map.on("load", initDraw);
    }

    return () => {
      // Cleanup handled by map removal
    };
  }, [mapRef, setDrawnCoordinates, setBoundingBox, setSelectionInfo, setSidebarOpen]);

  useEffect(() => {
    const draw = drawRef.current;
    if (!draw) return;

    switch (activeTool) {
      case "polygon":
        draw.changeMode("draw_polygon");
        break;
      case "line":
        draw.changeMode("draw_line_string");
        break;
      case "pan":
      default:
        draw.changeMode("simple_select");
        break;
    }
  }, [activeTool]);

  return drawRef;
}
