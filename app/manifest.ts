import type { MetadataRoute } from "next";

// This file makes Next.js itself serve /manifest.json.
// Put it at: app/manifest.ts
// Even if public/manifest.json is missing, this guarantees the URL works.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pray-Read Bible",
    short_name: "Pray-Read",
    description:
      "A Digital Sanctuary — A living Altar where the Word of God ceases to be mere text and becomes Spirit and Life.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#1e40af",
    theme_color: "#1e40af",
    icons: [
      { src: "/assets/PrayRead-logo.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/assets/PrayRead-logo.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/assets/PrayRead-logo.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
