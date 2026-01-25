import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { gameAccountApi } from '@/services/gameAccountApi'
import type { GameAccount } from '@/types/game'
import {
  getAdvice,
  detectPhase,
  PhaseDetectionResponse,
  ConversationMessage,
} from '@/services/strategyApi'

export default function AIAdvisorPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const initialAccountId = searchParams.get('accountId')

  const [accounts, setAccounts] = useState<GameAccount[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string>(initialAccountId || '')
  const [phaseInfo, setPhaseInfo] = useState<PhaseDetectionResponse | null>(null)
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 載入帳號列表
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const data = await gameAccountApi.getAll()
        setAccounts(data.accounts || [])
        if (!selectedAccountId && data.accounts?.length > 0) {
          setSelectedAccountId(data.accounts[0].account_id)
        }
      } catch (err) {
        console.error('載入帳號失敗:', err)
      }
    }
    loadAccounts()
  }, [])

  // 當選擇帳號時載入階段資訊
  useEffect(() => {
    if (!selectedAccountId) return

    const loadPhaseInfo = async () => {
      try {
        const data = await detectPhase(selectedAccountId)
        setPhaseInfo(data)
      } catch (err) {
        console.error('載入階段資訊失敗:', err)
      }
    }
    loadPhaseInfo()
  }, [selectedAccountId])

  // 自動滾動到最新訊息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!inputValue.trim() || !selectedAccountId) return

    const userMessage = inputValue.trim()
    setInputValue('')
    setError(null)

    // 添加用戶訊息
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    try {
      const response = await getAdvice(
        selectedAccountId,
        userMessage,
        conversationId || undefined
      )

      // 更新對話 ID
      if (!conversationId) {
        setConversationId(response.conversation_id)
      }

      // 添加 AI 回應
      setMessages((prev) => [...prev, { role: 'assistant', content: response.answer }])
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '發送失敗'
      setError(errorMessage)
      // 移除用戶訊息（因為請求失敗）
      setMessages((prev) => prev.slice(0, -1))
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleNewConversation = () => {
    setMessages([])
    setConversationId(null)
    setError(null)
  }

  const getProgressBadgeVariant = (status: string) => {
    switch (status) {
      case 'ahead':
        return 'default'
      case 'normal':
        return 'secondary'
      case 'behind':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const getProgressLabel = (status: string) => {
    switch (status) {
      case 'ahead':
        return t('strategy.ahead')
      case 'normal':
        return t('strategy.normal')
      case 'behind':
        return t('strategy.behind')
      default:
        return status
    }
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左側 - 階段資訊 */}
        <div className="lg:col-span-1 space-y-4">
          {/* 帳號選擇 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('strategy.selectAccount')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger>
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
            </CardContent>
          </Card>

          {/* 階段資訊 */}
          {phaseInfo && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t('strategy.phaseInfo')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm text-muted-foreground">{t('strategy.currentPhase')}</div>
                  <div className="font-medium">{phaseInfo.phase_name_zh}</div>
                  <div className="text-xs text-muted-foreground">{phaseInfo.phase_description}</div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">{t('strategy.serverDay')}</div>
                    <div className="font-medium">Day {phaseInfo.day}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">{t('strategy.progress')}</div>
                    <Badge variant={getProgressBadgeVariant(phaseInfo.progress_status)}>
                      {getProgressLabel(phaseInfo.progress_status)}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">{t('strategy.villages')}</div>
                    <div className="font-medium">
                      {phaseInfo.village_count} / {phaseInfo.standard.target_villages}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">{t('strategy.population')}</div>
                    <div className="font-medium">
                      {phaseInfo.total_population.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground mb-2">
                    {t('strategy.recommendations')}
                  </div>
                  <ul className="text-sm space-y-1">
                    {phaseInfo.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 右側 - 對話區域 */}
        <div className="lg:col-span-2">
          <Card className="h-[calc(100vh-12rem)]">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">{t('strategy.aiAdvisor')}</CardTitle>
              {messages.length > 0 && (
                <Button variant="outline" size="sm" onClick={handleNewConversation}>
                  {t('strategy.newConversation')}
                </Button>
              )}
            </CardHeader>
            <CardContent className="flex flex-col h-[calc(100%-5rem)]">
              {/* 訊息列表 */}
              <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <div className="text-center">
                      <p className="text-lg mb-2">{t('strategy.welcomeTitle')}</p>
                      <p className="text-sm">{t('strategy.welcomeHint')}</p>
                      <div className="mt-4 space-y-2">
                        <p className="text-xs text-muted-foreground">{t('strategy.exampleQuestions')}</p>
                        <div className="flex flex-wrap gap-2 justify-center">
                          {[
                            t('strategy.example1'),
                            t('strategy.example2'),
                            t('strategy.example3'),
                          ].map((example, idx) => (
                            <Button
                              key={idx}
                              variant="outline"
                              size="sm"
                              onClick={() => setInputValue(example)}
                            >
                              {example}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-2 ${
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
                      </div>
                    </div>
                  ))
                )}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-4 py-2">
                      <div className="flex items-center gap-2">
                        <div className="animate-pulse">{t('strategy.thinking')}</div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* 錯誤訊息 */}
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* 輸入區域 */}
              <div className="flex gap-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={t('strategy.inputPlaceholder')}
                  disabled={isLoading || !selectedAccountId}
                />
                <Button
                  onClick={handleSend}
                  disabled={isLoading || !inputValue.trim() || !selectedAccountId}
                >
                  {t('strategy.send')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
