import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { ROUTES } from '@/constants/routes'

interface RequireAuthProps {
  children: React.ReactNode
}

/**
 * 需要認證的路由包裝元件
 * 會在認證檢查完成前顯示 loading，未認證則重定向到登入頁面
 */
export default function RequireAuth({ children }: RequireAuthProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  // 認證檢查中，顯示 loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">載入中...</div>
      </div>
    )
  }

  // 未認證，重定向到登入頁面，並記錄原本要去的頁面
  if (!isAuthenticated) {
    return <Navigate to={ROUTES.AUTH.LOGIN} state={{ from: location }} replace />
  }

  // 已認證，渲染子元件
  return <>{children}</>
}
