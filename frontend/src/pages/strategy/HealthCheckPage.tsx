import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { gameAccountApi } from '@/services/gameAccountApi'
import type { GameAccount } from '@/types/game'
import { healthCheck, HealthCheckResponse, HealthCheckItem } from '@/services/strategyApi'

export default function HealthCheckPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const initialAccountId = searchParams.get('accountId')

  const [accounts, setAccounts] = useState<GameAccount[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string>(initialAccountId || '')
  const [healthData, setHealthData] = useState<HealthCheckResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 載入帳號列表
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const data = await gameAccountApi.getAll()
        setAccounts(data.accounts || [])
        if (!initialAccountId && data.accounts?.length > 0) {
          setSelectedAccountId(data.accounts[0].account_id)
        }
      } catch (err) {
        console.error('載入帳號失敗:', err)
      }
    }
    loadAccounts()
  }, [initialAccountId])

  // 當選擇帳號時執行健康檢查
  useEffect(() => {
    if (!selectedAccountId) return

    const runHealthCheck = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const data = await healthCheck(selectedAccountId)
        setHealthData(data)
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : '健康檢查失敗'
        setError(errorMessage)
      } finally {
        setIsLoading(false)
      }
    }
    runHealthCheck()
  }, [selectedAccountId])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good':
      case 'healthy':
        return 'text-green-500'
      case 'warning':
        return 'text-yellow-500'
      case 'critical':
        return 'text-red-500'
      default:
        return 'text-gray-500'
    }
  }

  const getStatusBadgeVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'good':
      case 'healthy':
        return 'default'
      case 'warning':
        return 'secondary'
      case 'critical':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'good':
      case 'healthy':
        return t('health.good')
      case 'warning':
        return t('health.warning')
      case 'critical':
        return t('health.critical')
      default:
        return status
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-500'
    if (score >= 60) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const renderCheckItem = (item: HealthCheckItem) => (
    <Card key={item.name} className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{item.name}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={getStatusBadgeVariant(item.status)}>
              {getStatusLabel(item.status)}
            </Badge>
            <span className={`font-bold ${getStatusColor(item.status)}`}>
              {item.score}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Progress
          value={item.score}
          className="h-2 mb-3"
        />
        <p className="text-sm text-muted-foreground mb-2">{item.message}</p>
        {item.suggestions.length > 0 && (
          <div className="mt-2">
            <p className="text-xs text-muted-foreground mb-1">{t('health.suggestions')}:</p>
            <ul className="text-sm space-y-1">
              {item.suggestions.map((suggestion, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="max-w-4xl mx-auto">
        {/* 標題和帳號選擇 */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">{t('health.title')}</h1>
          <div className="flex items-center gap-4">
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder={t('strategy.selectAccountPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.account_id} value={account.account_id}>
                    {account.server_name || account.server_url} ({account.player_name || '未知'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 錯誤訊息 */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTitle>{t('common.error')}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* 載入中 */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-pulse text-muted-foreground">{t('health.checking')}</div>
          </div>
        )}

        {/* 健康檢查結果 */}
        {healthData && !isLoading && (
          <div className="space-y-6">
            {/* 總體評分 */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold mb-1">{t('health.overallScore')}</h2>
                    <Badge variant={getStatusBadgeVariant(healthData.overall_status)} className="text-sm">
                      {getStatusLabel(healthData.overall_status)}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className={`text-5xl font-bold ${getStatusColor(healthData.overall_status)}`}>
                      {healthData.overall_score}
                    </div>
                    <div className="text-sm text-muted-foreground">/100</div>
                  </div>
                </div>
                <Progress
                  value={healthData.overall_score}
                  className={`h-3 mt-4 ${getScoreColor(healthData.overall_score)}`}
                />
              </CardContent>
            </Card>

            {/* 優先改進建議 */}
            {healthData.priority_actions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t('health.priorityActions')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-2">
                    {healthData.priority_actions.map((action, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            )}

            {/* 各項檢查詳情 */}
            <div>
              <h2 className="text-lg font-semibold mb-4">{t('health.detailedChecks')}</h2>
              {healthData.checks.map(renderCheckItem)}
            </div>

            {/* 操作按鈕 */}
            <div className="flex gap-4 justify-center">
              <Button
                onClick={() => {
                  setHealthData(null)
                  setSelectedAccountId(selectedAccountId)
                }}
              >
                {t('health.recheck')}
              </Button>
            </div>
          </div>
        )}

        {/* 無帳號 */}
        {!selectedAccountId && !isLoading && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <p>{t('health.noAccountSelected')}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
