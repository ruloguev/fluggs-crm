import type { Metadata } from "next"
import SolicitarDemoPage from "./SolicitarDemoClient"

export const metadata: Metadata = {
  title: "Solicitar Demo - Flugzz CRM",
  description: "Solicita una demo de Flugzz CRM y descubre cómo centralizar tus leads y automatizar tus procesos inmobiliarios.",
  robots: { index: true, follow: true },
  alternates: { canonical: "https://flugzz.xyz/solicitar-demo" },
}

export default function Page() {
  return <SolicitarDemoPage />
}
