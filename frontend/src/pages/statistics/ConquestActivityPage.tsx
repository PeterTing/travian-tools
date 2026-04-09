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
import { statisticsApi, type ConquestItem } from '@/services/statisticsApi'

const DEFAULT_SERVER = 'https://nys.x1.asia.travian.com'
const PAGE_SIZE = 20

export default function ConquestActivityPage() {
  const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER)
  const [inputUrl, setInputUrl] = useState(DEFAULT_SERVER)
  const [conquests, setConquests] = useState<ConquestItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await statisticsApi.getConquests({
        server_url: serverUrl,
        page,
        page_size: PAGE_SIZE,
      })
      setConquests(data.items)
      setTotal(data.total)
    } catch {
      setError('無法載入征服記錄')
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
      <h1 className="text-3xl font-bold mb-6">征服記錄</h1>

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
              征服記錄 (共 {total.toLocaleString()} 筆)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>村莊</TableHead>
                  <TableHead>座標</TableHead>
                  <TableHead>原擁有者</TableHead>
                  <TableHead>新擁有者</TableHead>
                  <TableHead>偵測時間</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conquests.map((conquest, idx) => (
                  <TableRow key={`${conquest.village_id}-${idx}`}>
                    <TableCell className="font-medium">
                      {conquest.village_name}
                    </TableCell>
                    <TableCell>
                      ({conquest.x}|{conquest.y})
                    </TableCell>
                    <TableCell>
                      {conquest.old_player_name}
                      {conquest.old_alliance_name && (
                        <span className="text-muted-foreground ml-1">
                          [{conquest.old_alliance_name}]
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {conquest.new_player_name}
                      {conquest.new_alliance_name && (
                        <span className="text-muted-foreground ml-1">
                          [{conquest.new_alliance_name}]
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(conquest.detected_at).toLocaleString('zh-TW')}
                    </TableCell>
                  </TableRow>
                ))}
                {conquests.length === 0 && (
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
