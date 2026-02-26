import { NextRequest, NextResponse } from "next/server";
import { getSupabase, uploadGeneratedImage } from "@/services/supabase";

export async function POST(req: NextRequest) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { error: "Save Project requires Supabase configuration. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment." },
        { status: 503 }
      );
    }

    const body = await req.json();
    const {
      coordinates,
      boundingBox,
      prompt,
      enhancedPrompt,
      stylePreset,
      imageUrl,
      mapCenter,
      mapZoom,
    } = body;

    if (!coordinates || !imageUrl || !prompt) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const projectId = crypto.randomUUID();

    // Upload image to Supabase Storage
    let storedImageUrl = imageUrl;
    try {
      storedImageUrl = await uploadGeneratedImage(imageUrl, projectId);
    } catch (err) {
      console.warn("Image upload to storage failed, using original URL:", err);
    }

    const supabase = getSupabase();
    const { data, error } = await supabase.from("projects").insert({
      id: projectId,
      coordinates,
      bounding_box: boundingBox,
      prompt,
      enhanced_prompt: enhancedPrompt,
      style_preset: stylePreset,
      image_url: storedImageUrl,
      map_center: mapCenter,
      map_zoom: mapZoom,
    }).select().single();

    if (error) {
      throw new Error(`Database insert failed: ${error.message}`);
    }

    return NextResponse.json({ project: data });
  } catch (error) {
    console.error("Save error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to save project",
      },
      { status: 500 }
    );
  }
}
