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
import { statisticsApi, type AllianceRankingItem } from '@/services/statisticsApi'

const DEFAULT_SERVER = 'https://nys.x1.asia.travian.com'
const PAGE_SIZE = 20

type SortField = 'population' | 'member_count' | 'conquests'

function formatDiff(diff: number): JSX.Element | null {
  if (diff === 0) return null
  const color = diff > 0 ? 'text-green-600' : 'text-red-600'
  const sign = diff > 0 ? '+' : ''
  return <span className={color}>({sign}{diff.toLocaleString()})</span>
}

export default function AllianceRankingPage() {
  const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER)
  const [inputUrl, setInputUrl] = useState(DEFAULT_SERVER)
  const [alliances, setAlliances] = useState<AllianceRankingItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState<SortField>('population')
  const [order, setOrder] = useState<'asc' | 'desc'>('desc')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await statisticsApi.getAllianceRanking({
        server_url: serverUrl,
        sort_by: sortBy,
        order,
        page,
        page_size: PAGE_SIZE,
        search: search || undefined,
      })
      setAlliances(data.items)
      setTotal(data.total)
    } catch {
      setError('無法載入聯盟排名')
    } finally {
      setLoading(false)
    }
  }, [serverUrl, sortBy, order, page, search])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleServerSearch = () => {
    setServerUrl(inputUrl)
    setPage(1)
  }

  const handleSearch = () => {
    setSearch(searchInput)
    setPage(1)
  }

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setOrder(order === 'desc' ? 'asc' : 'desc')
    } else {
      setSortBy(field)
      setOrder('desc')
    }
    setPage(1)
  }

  const sortIndicator = (field: SortField) => {
    if (sortBy !== field) return ''
    return order === 'desc' ? ' ▼' : ' ▲'
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">聯盟排名</h1>

      {/* Server URL input */}
      <div className="flex gap-2 mb-4">
        <Input
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          placeholder="伺服器 URL"
          className="max-w-lg"
          onKeyDown={(e) => e.key === 'Enter' && handleServerSearch()}
        />
        <Button onClick={handleServerSearch}>查詢</Button>
      </div>

      {/* Search + Sort */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="搜尋聯盟名稱..."
          className="max-w-xs"
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <Button variant="outline" size="sm" onClick={handleSearch}>
          搜尋
        </Button>
        <div className="ml-auto flex gap-1">
          {(['population', 'member_count', 'conquests'] as SortField[]).map((field) => (
            <Button
              key={field}
              variant={sortBy === field ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSort(field)}
            >
              {field === 'population' ? '人口' : field === 'member_count' ? '成員' : '征服'}
              {sortIndicator(field)}
            </Button>
          ))}
        </div>
      </div>

      {loading && <p className="text-center py-8">Loading...</p>}
      {error && <p className="text-center py-8 text-red-500">{error}</p>}

      {!loading && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              聯盟排名 (共 {total.toLocaleString()} 個)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>聯盟</TableHead>
                  <TableHead
                    className="text-right cursor-pointer select-none"
                    onClick={() => handleSort('member_count')}
                  >
                    成員{sortIndicator('member_count')}
                  </TableHead>
                  <TableHead
                    className="text-right cursor-pointer select-none"
                    onClick={() => handleSort('conquests')}
                  >
                    征服{sortIndicator('conquests')}
                  </TableHead>
                  <TableHead
                    className="text-right cursor-pointer select-none"
                    onClick={() => handleSort('population')}
                  >
                    人口{sortIndicator('population')}
                  </TableHead>
                  <TableHead className="text-right">人均人口</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alliances.map((alliance) => (
                  <TableRow key={alliance.alliance_id}>
                    <TableCell>{alliance.rank}</TableCell>
                    <TableCell className="font-medium">
                      {alliance.alliance_name}
                    </TableCell>
                    <TableCell className="text-right">
                      {alliance.member_count}{' '}
                      {formatDiff(alliance.member_diff)}
                    </TableCell>
                    <TableCell className="text-right">
                      {alliance.conquests.toLocaleString()}{' '}
                      {formatDiff(alliance.conquests_diff)}
                    </TableCell>
                    <TableCell className="text-right">
                      {alliance.population.toLocaleString()}{' '}
                      {formatDiff(alliance.population_diff)}
                    </TableCell>
                    <TableCell className="text-right">
                      {alliance.population_per_member.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
                {alliances.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
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
