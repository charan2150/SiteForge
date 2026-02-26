# SiteForge

AI-powered geospatial visualization for civil and geotechnical engineers. Draw a polygon on a map, describe what you want to see, and generate photorealistic site visualizations.

## Features

- **Interactive map** — Mapbox GL with drawing tools (polygon, line)
- **AI image generation** — Gemini edits the map screenshot inside your drawn boundary
- **Style presets** — Top-down plan, geotechnical cross-section, architectural render
- **Optional prompt enhancement** — Improve prompts with AI, or use your raw prompt
- **Export & save** — Export the view or save projects to Supabase

## Getting Started

### Prerequisites

- Node.js 18+
- Mapbox account
- Google AI (Gemini) API key

### Local Development

1. Clone and install:
   ```bash
   cd geo-ai-app
   npm install
   ```

2. Copy environment variables:
   ```bash
   cp .env.example .env.local
   ```

3. Add your keys to `.env.local`:
   - `NEXT_PUBLIC_MAPBOX_TOKEN` — from [Mapbox Access Tokens](https://account.mapbox.com/access-tokens/)
   - `GEMINI_API_KEY` — from [Google AI Studio](https://ai.google.dev/)
   - Supabase vars (optional, for Save Project)

4. Run the dev server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

### Deploy on Vercel

1. Push your code to GitHub (or GitLab, Bitbucket).

2. [Import the project](https://vercel.com/new) in Vercel. If the app lives in a subfolder (e.g. `geo-ai-app`), set **Root Directory** to that folder.

3. Add environment variables in **Project Settings → Environment Variables**:
   - `NEXT_PUBLIC_MAPBOX_TOKEN` (required)
   - `GEMINI_API_KEY` (required)
   - `NEXT_PUBLIC_SUPABASE_URL` (optional, for Save)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (optional, for Save)

4. Deploy. The generate API uses a 120s timeout for image editing.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Yes | Mapbox public token for maps and geocoding |
| `GEMINI_API_KEY` | Yes | Google Gemini API key (image models need paid quota) |
| `NEXT_PUBLIC_SUPABASE_URL` | No | Supabase project URL for Save Project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No | Supabase anon key for Save Project |

## How It Works

1. Draw a polygon on the map to select a site.
2. Enter a prompt describing the visualization.
3. Optionally click **Improve with AI** to enhance the prompt.
4. Click **Generate Visualization** — the app captures the map, draws a red boundary, sends it to Gemini for in-place editing, and drapes the result back on the map.

## License

Private — for internal use.
