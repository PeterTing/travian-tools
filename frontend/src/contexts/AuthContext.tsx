import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import authApi from '@/services/authApi'
import type { UserResponse, UserLoginRequest, UserRegisterRequest } from '@/types/game'

interface AuthContextType {
  user: UserResponse | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (data: UserLoginRequest) => Promise<void>
  register: (data: UserRegisterRequest) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  const checkAuth = useCallback(async () => {
    if (authApi.isAuthenticated()) {
      try {
        const userData = await authApi.getMe()
        setUser(userData)
      } catch {
        setUser(null)
      }
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const login = async (data: UserLoginRequest) => {
    await authApi.login(data)
    const userData = await authApi.getMe()
    setUser(userData)
    navigate('/')
  }

  const register = async (data: UserRegisterRequest) => {
    await authApi.register(data)
    navigate('/login')
  }

  const logout = async () => {
    await authApi.logout()
    setUser(null)
    navigate('/login')
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
