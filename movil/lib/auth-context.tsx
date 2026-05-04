'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from './supabase'

interface AuthState {
  user: User | null
  propertyId: string | null
  propertyName: string | null
  rol: string | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState>({
  user: null,
  propertyId: null,
  propertyName: null,
  rol: null,
  loading: true,
  signOut: async () => {},
})

async function loadPropertyData(userId: string): Promise<{
  propertyId: string | null
  propertyName: string | null
  rol: string | null
}> {
  const { data, error } = await supabase
    .from('property_users')
    .select('property_id, rol, properties(nombre)')
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !data) return { propertyId: null, propertyName: null, rol: null }

  const nombre = Array.isArray(data.properties)
    ? (data.properties[0] as any)?.nombre ?? null
    : (data.properties as any)?.nombre ?? null

  return {
    propertyId: data.property_id,
    propertyName: nombre,
    rol: data.rol,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [propertyId, setPropertyId] = useState<string | null>(null)
  const [propertyName, setPropertyName] = useState<string | null>(null)
  const [rol, setRol] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function handleUser(u: User | null) {
    setUser(u)
    if (!u) {
      setPropertyId(null)
      setPropertyName(null)
      setRol(null)
      setLoading(false)
      return
    }
    const data = await loadPropertyData(u.id)
    setPropertyId(data.propertyId)
    setPropertyName(data.propertyName)
    setRol(data.rol)
    setLoading(false)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      handleUser(data.session?.user ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      handleUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{
      user,
      propertyId,
      propertyName,
      rol,
      loading,
      signOut: async () => { await supabase.auth.signOut() },
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
