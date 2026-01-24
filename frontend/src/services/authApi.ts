import api, { setTokens, clearTokens, getAccessToken } from './api'
import type {
  UserRegisterRequest,
  UserLoginRequest,
  TokenResponse,
  UserResponse,
} from '@/types/game'

export const authApi = {
  register: async (data: UserRegisterRequest): Promise<UserResponse> => {
    const response = await api.post<UserResponse>('/auth/register', data)
    return response.data
  },

  login: async (data: UserLoginRequest): Promise<TokenResponse> => {
    const response = await api.post<TokenResponse>('/auth/login', data)
    const { access_token, refresh_token } = response.data
    setTokens(access_token, refresh_token)
    return response.data
  },

  logout: async (): Promise<void> => {
    try {
      await api.post('/auth/logout')
    } finally {
      clearTokens()
    }
  },

  getMe: async (): Promise<UserResponse> => {
    const response = await api.get<UserResponse>('/auth/me')
    return response.data
  },

  isAuthenticated: (): boolean => {
    return !!getAccessToken()
  },
}

export default authApi
