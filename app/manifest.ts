import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Flugzz CRM",
    short_name: "Flugzz",
    description: "CRM inmobiliario para agentes en campo",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    orientation: "portrait-primary",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
    categories: ["business", "productivity"],
    shortcuts: [
      { name: "Pipeline", url: "/pipeline", description: "Ver el pipeline de leads" },
      { name: "Contactos", url: "/contactos", description: "Ver contactos" },
    ],
  }
}
