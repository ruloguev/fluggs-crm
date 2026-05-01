"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import type { Session } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase"

type Profile = {
  id: string
  full_name: string
  company_id: string | null
  role_id: string | null
}

type Company = {
  id: string
  name: string
}

type Role = {
  id: string
  name: string
  level: number
  permissions: Record<string, boolean>
}

type AuthContextValue = {
  loading: boolean
  profile: Profile | null
  company: Company | null
  role: Role | null
  can: (permission: string) => boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [role, setRole] = useState<Role | null>(null)

  const loadFromSession = useCallback(async (session: Session | null) => {
    if (!session?.user) {
      setProfile(null)
      setCompany(null)
      setRole(null)
      setLoading(false)
      return
    }

    setLoading(true)

    const { data: profileData } = await supabase
      .from("profiles")
      .select("id, full_name, company_id, role_id")
      .eq("id", session.user.id)
      .single()

    const nextProfile = (profileData as Profile | null) ?? null
    setProfile(nextProfile)

    if (!nextProfile?.company_id) {
      setCompany(null)
      setRole(null)
      setLoading(false)
      return
    }

    const [companyResult, roleResult] = await Promise.all([
      supabase
        .from("companies")
        .select("id, name")
        .eq("id", nextProfile.company_id)
        .single(),
      nextProfile.role_id
        ? supabase
            .from("roles")
            .select("id, name, level, permissions")
            .eq("id", nextProfile.role_id)
            .single()
        : Promise.resolve({ data: null }),
    ])

    setCompany((companyResult.data as Company | null) ?? null)
    setRole((roleResult.data as Role | null) ?? null)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      void loadFromSession(data.session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void loadFromSession(session)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [loadFromSession, supabase.auth])

  const can = useCallback((permission: string) => {
    if (!permission) return true
    return Boolean(role?.permissions?.[permission])
  }, [role])

  const value = useMemo<AuthContextValue>(() => ({
    loading,
    profile,
    company,
    role,
    can,
  }), [can, company, loading, profile, role])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return ctx
}
