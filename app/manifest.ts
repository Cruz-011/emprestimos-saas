import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cifra Finance",
    short_name: "Cifra",
    description: "Gestão de empréstimos pessoais legais",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0A0C0F",
    theme_color: "#0A0C0F",
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}