import type { Metadata } from "next"
import LandingPageMockup from "./LandingClient"

export const metadata: Metadata = {
  title: "Flugzz CRM - Ecosistema operativo para Real Estate",
  description: "Centraliza tus leads, automatiza tus cierres y domina tu pipeline. CRM inmobiliario diseñado para agentes que no juegan a empatar.",
  robots: { index: true, follow: true },
  alternates: { canonical: "https://flugzz.xyz" },
  openGraph: {
    title: "Flugzz CRM - Ecosistema operativo para Real Estate",
    description: "Centraliza tus leads, automatiza tus cierres y domina tu pipeline.",
  },
}

export default function Page() {
  return <LandingPageMockup />
}
