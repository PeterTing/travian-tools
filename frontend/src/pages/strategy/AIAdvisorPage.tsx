import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { gameAccountApi } from '@/services/gameAccountApi'
import { conversationApi, ConversationSummary, ConversationMessage } from '@/services/conversationApi'
import type { GameAccount, PlayerRole } from '@/types/game'
import { detectPhase, PhaseDetectionResponse } from '@/services/strategyApi'

export default function AIAdvisorPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const initialAccountId = searchParams.get('accountId')

  // 帳號相關狀態
  const [accounts, setAccounts] = useState<GameAccount[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string>(initialAccountId || '')
  const [phaseInfo, setPhaseInfo] = useState<PhaseDetectionResponse | null>(null)
  const [isUpdatingRole, setIsUpdatingRole] = useState(false)

  // 對話相關狀態
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [conversationSummary, setConversationSummary] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingConversations, setIsLoadingConversations] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteConversationId, setDeleteConversationId] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 角色選項
  const roleOptions: { value: PlayerRole; label: string; description: string }[] = [
    { value: 'attacker', label: t('strategy.role.attacker'), description: t('strategy.role.attackerDesc') },
    { value: 'defender', label: t('strategy.role.defender'), description: t('strategy.role.defenderDesc') },
    { value: 'farmer', label: t('strategy.role.farmer'), description: t('strategy.role.farmerDesc') },
    { value: 'hybrid', label: t('strategy.role.hybrid'), description: t('strategy.role.hybridDesc') },
  ]

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

  // 當選擇帳號時載入階段資訊和對話列表
  useEffect(() => {
    if (!selectedAccountId) return

    const loadData = async () => {
      try {
        // 載入階段資訊
        const phaseData = await detectPhase(selectedAccountId)
        setPhaseInfo(phaseData)

        // 載入對話列表
        setIsLoadingConversations(true)
        const convData = await conversationApi.list({ account_id: selectedAccountId })
        setConversations(convData.conversations)
      } catch (err) {
        console.error('載入資料失敗:', err)
      } finally {
        setIsLoadingConversations(false)
      }
    }
    loadData()

    // 切換帳號時重置對話狀態
    setCurrentConversationId(null)
    setMessages([])
    setConversationSummary(null)
  }, [selectedAccountId])

  // 載入對話詳情
  useEffect(() => {
    if (!currentConversationId) {
      setMessages([])
      setConversationSummary(null)
      return
    }

    const loadConversation = async () => {
      try {
        const data = await conversationApi.get(currentConversationId)
        setMessages(data.messages)
        setConversationSummary(data.summary)
      } catch (err) {
        console.error('載入對話失敗:', err)
      }
    }
    loadConversation()
  }, [currentConversationId])

  // 自動滾動到最新訊息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleNewConversation = async () => {
    if (!selectedAccountId) return

    try {
      const conv = await conversationApi.create({ account_id: selectedAccountId })
      setConversations((prev) => [conv, ...prev])
      setCurrentConversationId(conv.conversation_id)
      setMessages([])
      setConversationSummary(null)
      setError(null)
    } catch (err) {
      console.error('建立對話失敗:', err)
    }
  }

  const handleSelectConversation = (conversationId: string) => {
    setCurrentConversationId(conversationId)
    setError(null)
  }

  const handleDeleteConversation = async () => {
    if (!deleteConversationId) return

    try {
      await conversationApi.delete(deleteConversationId)
      setConversations((prev) => prev.filter((c) => c.conversation_id !== deleteConversationId))

      // 如果刪除的是當前對話，重置狀態
      if (currentConversationId === deleteConversationId) {
        setCurrentConversationId(null)
        setMessages([])
        setConversationSummary(null)
      }
    } catch (err) {
      console.error('刪除對話失敗:', err)
    } finally {
      setDeleteConversationId(null)
    }
  }

  const handleSend = async () => {
    if (!inputValue.trim() || !selectedAccountId) return

    const userMessage = inputValue.trim()
    setInputValue('')
    setError(null)

    // 如果沒有當前對話，先建立一個
    let convId = currentConversationId
    if (!convId) {
      try {
        const conv = await conversationApi.create({ account_id: selectedAccountId })
        setConversations((prev) => [conv, ...prev])
        convId = conv.conversation_id
        setCurrentConversationId(convId)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '建立對話失敗'
        setError(errorMessage)
        return
      }
    }

    setIsLoading(true)

    try {
      const response = await conversationApi.sendMessage(convId, userMessage)

      // 添加訊息
      setMessages((prev) => [...prev, response.user_message, response.assistant_message])

      // 更新對話列表中的預覽
      setConversations((prev) =>
        prev.map((c) =>
          c.conversation_id === convId
            ? {
                ...c,
                message_count: c.message_count + 2,
                last_message_preview:
                  response.assistant_message.content.slice(0, 50) + '...',
                updated_at: new Date().toISOString(),
              }
            : c
        )
      )
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '發送失敗'
      setError(errorMessage)
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

  const handleRoleChange = async (role: PlayerRole) => {
    if (!selectedAccountId) return

    setIsUpdatingRole(true)
    try {
      const updatedAccount = await gameAccountApi.update(selectedAccountId, { player_role: role })
      setAccounts((prev) =>
        prev.map((acc) =>
          acc.account_id === selectedAccountId ? { ...acc, player_role: updatedAccount.player_role } : acc
        )
      )
      const data = await detectPhase(selectedAccountId)
      setPhaseInfo(data)
    } catch (err) {
      console.error('更新角色失敗:', err)
    } finally {
      setIsUpdatingRole(false)
    }
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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      return date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
    } else if (days === 1) {
      return t('common.yesterday') || '昨天'
    } else if (days < 7) {
      return `${days} 天前`
    } else {
      return date.toLocaleDateString('zh-TW')
    }
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 左側 - 對話列表 */}
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

          {/* 對話歷史 */}
          <Card className="flex-1">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">{t('strategy.conversationHistory') || '對話歷史'}</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNewConversation}
                disabled={!selectedAccountId}
              >
                +
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[300px]">
                {isLoadingConversations ? (
                  <div className="p-4 text-center text-muted-foreground">
                    {t('common.loading')}
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    {t('strategy.noConversations') || '尚無對話紀錄'}
                  </div>
                ) : (
                  <div className="divide-y">
                    {conversations.map((conv) => (
                      <div
                        key={conv.conversation_id}
                        className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                          currentConversationId === conv.conversation_id ? 'bg-muted' : ''
                        }`}
                        onClick={() => handleSelectConversation(conv.conversation_id)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">
                              {conv.title || t('strategy.untitledConversation') || '新對話'}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {conv.last_message_preview || '...'}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-xs text-muted-foreground">
                              {formatDate(conv.updated_at)}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation()
                                setDeleteConversationId(conv.conversation_id)
                              }}
                            >
                              ×
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* 玩家角色設定 */}
          {selectedAccountId && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t('strategy.playerRole')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Select
                  value={accounts.find((a) => a.account_id === selectedAccountId)?.player_role || ''}
                  onValueChange={(value) => handleRoleChange(value as PlayerRole)}
                  disabled={isUpdatingRole}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('strategy.selectRolePlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-2">
                  {t('strategy.roleHint')}
                </p>
              </CardContent>
            </Card>
          )}

          {/* 階段資訊 */}
          {phaseInfo && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t('strategy.phaseInfo')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-sm text-muted-foreground">{t('strategy.currentPhase')}</div>
                  <div className="font-medium">{phaseInfo.phase_name_zh}</div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-muted-foreground">{t('strategy.serverDay')}</div>
                    <div className="font-medium">Day {phaseInfo.day}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">{t('strategy.progress')}</div>
                    <Badge variant={getProgressBadgeVariant(phaseInfo.progress_status)}>
                      {getProgressLabel(phaseInfo.progress_status)}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 右側 - 對話區域 */}
        <div className="lg:col-span-3">
          <Card className="h-[calc(100vh-10rem)]">
            <CardHeader className="pb-3 flex flex-row items-center justify-between border-b">
              <CardTitle className="text-base">{t('strategy.aiAdvisor')}</CardTitle>
              {currentConversationId && (
                <Button variant="outline" size="sm" onClick={handleNewConversation}>
                  {t('strategy.newConversation')}
                </Button>
              )}
            </CardHeader>
            <CardContent className="flex flex-col h-[calc(100%-4rem)] p-4">
              {/* 對話摘要（如果有） */}
              {conversationSummary && (
                <div className="mb-4 p-3 bg-muted/50 rounded-lg border">
                  <div className="text-xs font-medium text-muted-foreground mb-1">
                    {t('strategy.conversationSummary') || '對話摘要'}
                  </div>
                  <div className="text-sm">{conversationSummary}</div>
                </div>
              )}

              {/* 訊息列表 */}
              <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                {messages.length === 0 && !currentConversationId ? (
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
                  messages
                    .filter((msg) => !msg.is_compacted)
                    .map((msg) => (
                      <div
                        key={msg.message_id}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg px-4 py-2 ${
                            msg.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          {msg.role === 'assistant' ? (
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                          ) : (
                            <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
                          )}
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

      {/* 刪除確認對話框 */}
      <AlertDialog open={!!deleteConversationId} onOpenChange={() => setDeleteConversationId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('strategy.deleteConversation') || '刪除對話'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('strategy.deleteConversationConfirm') || '確定要刪除這個對話嗎？此操作無法復原。'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('gameAccounts.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConversation}>
              {t('gameAccounts.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
