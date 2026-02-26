# SiteForge: Overlay Capture → Drape Workflow & Debug Guide

## Debug Report (Download)

After generating a visualization, open the **Layers** panel and click **Download Debug Report**. This downloads:

1. **`siteforge-debug-{id}.json`** — Full pipeline metadata (coordinates, bounds, prompts, instruction, aspect ratios, timestamps)
2. **`siteforge-capture-{id}.jpg`** — The exact image sent to Gemini (with red polygon drawn)

Use these to compare what was captured vs. what was draped, and to verify the Gemini instruction.

Enable in production by setting `NEXT_PUBLIC_DEBUG=1` in your environment.

---

This document traces the flow from map capture to overlay display and identifies where alignment mismatches can occur.

---

## End-to-End Workflow

```
[User draws polygon] → [Clicks Generate] → [Capture] → [Gemini Edit] → [Drape] → [Display]
```

---

## Step-by-Step Pipeline

### STEP 1: User Draws Polygon
- **Where:** `useMapDraw.ts` → Mapbox Draw control
- **Output:** `drawnCoordinates` ([[lng,lat], ...]), `boundingBox` ([west, south, east, north])
- **Debug:** Log `drawnCoordinates` and `boundingBox` when user finishes drawing.

### STEP 2: Capture (GenerationSidebar.tsx → captureSiteScreenshot)

**2a. Save current map view**
- center, zoom, bearing, pitch

**2b. fitBounds**
- `map.setBearing(0)` `map.setPitch(0)`
- `map.fitBounds(padded, { duration: 0, padding: 0 })` — padded = bbox + 30%
- Wait for `map.once("idle")`

**2c. Remove Mapbox Draw**
- `draw.deleteAll()` — hides cyan polygon
- Wait for idle again

**2d. Get capture bounds**
- `actualBounds = map.getBounds()` → [west, south, east, north]
- **Potential mismatch #1:** `getBounds()` might not exactly match what’s visible in the canvas.

**2e. Capture canvas**
- `mapCanvas = map.getCanvas()`
- `ctx.drawImage(mapCanvas, 0, 0, width, height)` onto resize canvas
- `width = mapCanvas.width * scaleFactor`, `height = mapCanvas.height * scaleFactor`
- **Potential mismatch #2:** Canvas dimensions vs. geographic extent. The canvas aspect ratio must match the geographic bounds aspect ratio for perfect 1:1 mapping.

**2f. Draw red polygon**
- For each `[lng, lat]` in `polygonCoordinates`:
  - `point = map.project([lng, lat])`
  - Draw at `(point.x * dpr * scaleFactor, point.y * dpr * scaleFactor)`
- **Potential mismatch #3:** `map.project()` returns CSS pixels; canvas is at backing-store resolution (width = CSS × dpr). Must multiply by `devicePixelRatio` to align. If wrong, Gemini edits the wrong area and output is misaligned.

**2g. Restore**
- Restore Draw, center, zoom, bearing, pitch

**Output:** `{ dataUrl, captureBounds }`

---

### STEP 3: Gemini Edit (API route → gemini-image.ts)

- **Input:** `mapScreenshot` (dataUrl), `prompt`
- **Process:** Gemini edits inside the red polygon; returns new image
- **Potential mismatch #4:** Gemini can change resolution, aspect ratio, or add internal padding. If the returned image is not pixel-for-pixel the same extent as the input, draping will misalign.

**Output:** `imageUrl` (base64 data URI of edited image)

---

### STEP 4: Store Version (GenerationSidebar.tsx)

- `addVersion({ imageUrl, captureBounds, ... })`
- **Important:** `captureBounds` is from Step 2d, not recalculated.

---

### STEP 5: Drape (useMapOverlay.ts)

**5a. Get corners**
- `drapeBounds = version.captureBounds`
- `corners = getBboxCorners(drapeBounds)` → [[west,north], [east,north], [east,south], [west,south]]
- Mapbox ImageSource expects: [topLeft, topRight, bottomRight, bottomLeft]

**5b. Add/update ImageSource**
- `map.addSource(OVERLAY_SOURCE_ID, { type: "image", url, coordinates: corners })`
- **Potential mismatch #5:** Corner order or coordinate system (lng/lat) must exactly match Mapbox’s expectation.

**Output:** Overlay visible on map

---

## Debug Checklist

### A. Verify capture bounds vs. visible extent
- After `fitBounds` and before capture, log:
  - `map.getBounds()` (west, south, east, north)
  - `map.getCanvas().width`, `map.getCanvas().height`
- Compare aspect ratio:
  - Geographic: `(east-west) / (north-south)` (adjusted for latitude)
  - Canvas: `width / height`
- They should match; if not, the image will stretch or shift when draped.

### B. Verify `map.project()` vs. canvas
- Mapbox GL: `project()` usually returns coordinates in the same space as `canvas.width` and `canvas.height`.
- Check whether the map uses `devicePixelRatio` for the canvas. If canvas is `clientWidth * dpr`, coordinates from `project()` should be in that space.
- Debug: Draw a point at `(0,0)` and `(width,height)` — they should be at the corners of the captured image.

### C. Verify Gemini output dimensions
- Log the dimensions of:
  - Input image sent to Gemini (from `mapScreenshot`)
  - Output image returned by Gemini
- If aspect ratio differs, draping to the same bounds will distort or misalign.

### D. Verify corner order for Mapbox
- Mapbox ImageSource: [topLeft, topRight, bottomRight, bottomLeft] = [NW, NE, SE, SW]
- Current `getBboxCorners`: `[west,north], [east,north], [east,south], [west,south]` — correct.

### E. Capture vs. display viewport
- If the sidebar changes the map container size between capture and display, the map’s projection can differ.
- Capture and display use the same geographic bounds, so a different viewport should not change overlay placement. But if `getBounds()` behavior depends on container size, this could matter.

---

## Quick Debug: Add Console Logs

Add these temporarily to trace values:

**In `mask-utils.ts` → captureSiteScreenshot (after getBounds):**
```js
console.log("[DEBUG] captureBounds:", captureBounds);
console.log("[DEBUG] canvas:", mapCanvas.width, "x", mapCanvas.height);
console.log("[DEBUG] scaleFactor:", scaleFactor);
console.log("[DEBUG] aspect geo:", (captureBounds[2]-captureBounds[0])/(captureBounds[3]-captureBounds[1]));
console.log("[DEBUG] aspect canvas:", mapCanvas.width/mapCanvas.height);
```

**In `useMapOverlay.ts` (when applying):**
```js
console.log("[DEBUG] drapeBounds:", drapeBounds);
console.log("[DEBUG] corners:", corners);
```

**After Gemini returns (in API route or gemini-image.ts):**
- Decode the base64 image and log its width/height to compare with the input.

---

## Likely Mismatch Locations (Ranked)

1. **Gemini output resolution** — Model may return a different size/aspect ratio.
2. **`map.project()` coordinate space** — Possible mismatch between project() units and canvas pixels.
3. **`getBounds()` vs. actual visible extent** — Slight discrepancy at fitBounds edges.
4. **Canvas resize scaling** — Rounding or scaling errors when resizing before sending to Gemini.
