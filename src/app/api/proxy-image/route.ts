import { NextRequest, NextResponse } from "next/server";

const ALLOWED_ORIGINS = [
  "https://replicate.delivery",
  "https://pb.replicate.delivery",
  "https://replicate.dl.replicate.net",
];

function isAllowedUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return ALLOWED_ORIGINS.some(
      (origin) => u.origin === origin || u.hostname.endsWith(".replicate.delivery")
    );
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url || !isAllowedUrl(url)) {
    return NextResponse.json({ error: "Invalid or disallowed URL" }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: { Accept: "image/*" },
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Image fetch failed" }, { status: res.status });
    }
    const contentType = res.headers.get("content-type") || "image/png";
    const buffer = await res.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (e) {
    console.error("[SiteForge] proxy-image error:", e);
    return NextResponse.json({ error: "Proxy failed" }, { status: 500 });
  }
}
