import { create } from "zustand"
import type { User } from "@/gen/api/types/User.ts"

export type AuthUser = User

type AuthState = {
  user: AuthUser | null
  isAuthenticated: boolean
  isInitialized: boolean
  setUser: (user: AuthUser | null) => void
  setInitialized: (value: boolean) => void
  reset: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isInitialized: false,
  setUser: (user) => set({ user, isAuthenticated: user !== null }),
  setInitialized: (isInitialized) => set({ isInitialized }),
  reset: () => set({ user: null, isAuthenticated: false }),
}))
