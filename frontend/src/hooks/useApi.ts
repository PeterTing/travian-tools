import { useQuery, useMutation, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query'
import api from '@/services/api'
import { AxiosError, AxiosResponse } from 'axios'

type ApiResponse<T> = AxiosResponse<T>

export function useApiGet<T>(
  key: string[],
  url: string,
  options?: Omit<UseQueryOptions<ApiResponse<T>, AxiosError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: key,
    queryFn: () => api.get<T>(url),
    ...options,
  })
}

export function useApiPost<T, D = unknown>(
  url: string,
  options?: Omit<UseMutationOptions<ApiResponse<T>, AxiosError, D>, 'mutationFn'>
) {
  return useMutation({
    mutationFn: (data: D) => api.post<T>(url, data),
    ...options,
  })
}
