/**
 * src/contexts/AuthContext.tsx
 * ----------------------------
 * Global authentication context — wraps the entire app so any component
 * can read the current user and call login/logout without prop drilling.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

import {
  clearToken,
  getMe,
  isLoggedIn,
  loginUser,
  saveToken,
  type UserProfile,
} from '@/services/api'

// ── Context shape ──────────────────────────────────────────────────────────
interface AuthContextValue {
  user:    UserProfile | null
  loading: boolean
  login:   (email: string, password: string) => Promise<UserProfile>
  logout:  () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

// ── Provider ───────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  // On mount — rehydrate user from stored token
  useEffect(() => {
    if (isLoggedIn()) {
      getMe()
        .then(setUser)
        .catch(() => { clearToken(); setUser(null) })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = useCallback(async (email: string, password: string): Promise<UserProfile> => {
    const token = await loginUser(email, password)
    saveToken(token)
    const profile = await getMe()
    setUser(profile)
    return profile
  }, [])

  const logout = useCallback(() => {
    clearToken()
    setUser(null)
    window.location.href = '/login'
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// ── Hook ───────────────────────────────────────────────────────────────────
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
