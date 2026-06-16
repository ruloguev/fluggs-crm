"use client"

import { useEffect, useState } from "react"

export function PwaInstallButton() {
  const [status, setStatus] = useState<"loading" | "ready" | "installed" | "unsupported">("loading")
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [swStatus, setSwStatus] = useState<string>("checking...")

  useEffect(() => {
    if (typeof window === "undefined") return

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setStatus("installed")
      return
    }

    if (!("serviceWorker" in navigator)) {
      setStatus("unsupported")
      return
    }

    // Register SW
    navigator.serviceWorker.register("/sw.js").then((reg) => {
      setSwStatus("registered: " + reg.scope)
      if (reg.active) setSwStatus("active")
    }).catch((err: Error) => {
      setSwStatus("error: " + err.message)
    })

    // Listen for install prompt
    const handlePrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setStatus("ready")
    }
    window.addEventListener("beforeinstallprompt", handlePrompt)
    window.addEventListener("appinstalled", () => {
      setStatus("installed")
      setDeferredPrompt(null)
    })

    // Also check periodically if Chrome decided the PWA is installable
    const timer = setInterval(() => {
      if (status === "loading" && deferredPrompt) {
        // already handled by event
      }
    }, 2000)

    return () => {
      window.removeEventListener("beforeinstallprompt", handlePrompt)
      clearInterval(timer)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) {
      // Fallback: just show instructions
      alert("Para instalar: abre el menú ⋮ en Chrome → Instalar Flugzz")
      return
    }
    deferredPrompt.prompt()
    const result = await deferredPrompt.userChoice
    if (result.outcome === "accepted") setStatus("installed")
    setDeferredPrompt(null)
  }

  if (status === "installed") return null
  if (status === "unsupported") return null

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-xs">
      <button
        onClick={handleInstall}
        className="flex items-center gap-2 px-4 py-3 rounded-xl bg-flugzz-accent text-zinc-950 font-semibold text-sm shadow-lg hover:bg-cyan-300 transition-colors"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
        </svg>
        Instalar Flugzz
      </button>
      <p className="text-[10px] text-zinc-600 mt-1 text-right">SW: {swStatus}</p>
    </div>
  )
}
