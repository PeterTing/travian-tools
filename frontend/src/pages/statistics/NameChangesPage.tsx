import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { statisticsApi, type NameChangeItem } from '@/services/statisticsApi'

const DEFAULT_SERVER = 'https://nys.x1.asia.travian.com'
const PAGE_SIZE = 20

export default function NameChangesPage() {
  const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER)
  const [inputUrl, setInputUrl] = useState(DEFAULT_SERVER)
  const [nameChanges, setNameChanges] = useState<NameChangeItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await statisticsApi.getNameChanges({
        server_url: serverUrl,
        page,
        page_size: PAGE_SIZE,
      })
      setNameChanges(data.items)
      setTotal(data.total)
    } catch {
      setError('無法載入改名記錄')
    } finally {
      setLoading(false)
    }
  }, [serverUrl, page])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSearch = () => {
    setServerUrl(inputUrl)
    setPage(1)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">改名記錄</h1>

      {/* Server URL input */}
      <div className="flex gap-2 mb-6">
        <Input
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          placeholder="伺服器 URL"
          className="max-w-lg"
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <Button onClick={handleSearch}>查詢</Button>
      </div>

      {loading && <p className="text-center py-8">Loading...</p>}
      {error && <p className="text-center py-8 text-red-500">{error}</p>}

      {!loading && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              改名記錄 (共 {total.toLocaleString()} 筆)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>舊名稱</TableHead>
                  <TableHead></TableHead>
                  <TableHead>新名稱</TableHead>
                  <TableHead className="text-right">遊戲天數</TableHead>
                  <TableHead>偵測時間</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nameChanges.map((item, idx) => (
                  <TableRow key={`${item.player_id}-${idx}`}>
                    <TableCell className="font-medium">
                      {item.old_name}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-center">
                      &rarr;
                    </TableCell>
                    <TableCell className="font-medium">
                      {item.new_name}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.game_day ?? '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(item.detected_at).toLocaleString('zh-TW')}
                    </TableCell>
                  </TableRow>
                ))}
                {nameChanges.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      暫無資料
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  第 {page} / {totalPages} 頁
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    上一頁
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    下一頁
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
