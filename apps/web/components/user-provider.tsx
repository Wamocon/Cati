"use client"

import { createContext, useContext, ReactNode } from "react"
import { Role } from "@/lib/rbac"

export interface UserContextValue {
  id: string
  email?: string
  full_name?: string | null
  role: Role
  // Every business role the user holds (primary `role` is the highest-level
  // entry). Nav and route-guard checks widen to the union of these roles.
  roles: Role[]
  isActive: boolean
  company_id?: string | null
  phone?: string | null
  language?: string | null
  office_id?: string | null
  avatar_url?: string | null
}

const UserContext = createContext<UserContextValue | null>(null)

export function UserProvider({
  children,
  initialUser,
}: {
  children: ReactNode
  initialUser: UserContextValue
}) {
  return (
    <UserContext.Provider value={initialUser}>{children}</UserContext.Provider>
  )
}

export function useUser(): UserContextValue {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error("useUser must be used within a UserProvider")
  }
  return context
}
