import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error(
        "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
      );
    }
    _supabase = createClient(url, key);
  }
  return _supabase;
}

export async function uploadGeneratedImage(
  imageUrl: string,
  projectId: string
): Promise<string> {
  const supabase = getSupabase();
  const response = await fetch(imageUrl);
  const blob = await response.blob();
  const filename = `${projectId}-${Date.now()}.png`;

  const { data, error } = await supabase.storage
    .from("generated-images")
    .upload(filename, blob, {
      contentType: "image/png",
      upsert: false,
    });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data: publicUrl } = supabase.storage
    .from("generated-images")
    .getPublicUrl(data.path);

  return publicUrl.publicUrl;
}
