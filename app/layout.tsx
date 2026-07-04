import type { Metadata } from "next"
import "./globals.css"
import { AuthProvider } from "@/contexts/AuthContext"

export const metadata: Metadata = {
  metadataBase: new URL("https://flugzz.xyz"),
  robots: { index: false, follow: false },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Flugzz",
  },
  formatDetection: { telephone: false },
  themeColor: "#000000",
  title: "Flugzz CRM",
  description: "CRM inmobiliario para agentes en campo",
  icons: {
    icon: "/icon.svg",
    apple: "/icon-192.png",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body>
        <AuthProvider>{children}</AuthProvider>
        {/* PWA Service Worker registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(reg) {
                    console.log('[SW] Registered. Scope:', reg.scope);
                  }).catch(function(err) {
                    console.error('[SW] Registration failed:', err);
                  });
                });
              }
              // Capture beforeinstallprompt for manual install
              let deferredPrompt = null;
              window.addEventListener('beforeinstallprompt', function(e) {
                e.preventDefault();
                deferredPrompt = e;
                console.log('[PWA] Install prompt available');
                window.dispatchEvent(new CustomEvent('pwa-ready'));
              });
              window.addEventListener('appinstalled', function() {
                console.log('[PWA] Installed successfully');
                deferredPrompt = null;
              });
            `,
          }}
        />
      </body>
    </html>
  )
}