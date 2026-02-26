"use client";

import dynamic from "next/dynamic";

const MapContainer = dynamic(
  () =>
    import("@/components/map/MapContainer").then((mod) => mod.MapContainer),
  { ssr: false }
);

export default function Home() {
  return <MapContainer />;
}
