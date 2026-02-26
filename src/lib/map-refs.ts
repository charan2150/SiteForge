import type MapboxDraw from "@mapbox/mapbox-gl-draw";

let drawInstance: MapboxDraw | null = null;

export function setDrawInstance(draw: MapboxDraw | null) {
  drawInstance = draw;
}

export function getDrawInstance(): MapboxDraw | null {
  return drawInstance;
}
