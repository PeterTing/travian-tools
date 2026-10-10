import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { statisticsApi, type InactiveVillage } from '@/services/statisticsApi'
import CoordPair from '@/components/common/CoordPair'
import { EMPTY_COORD, coordPairValue, type CoordText } from '@/lib/coords'
import { useMapRadius } from '@/lib/mapRadius'

const DEFAULT_SERVER = 'https://nys.x1.asia.travian.com'
const PAGE_SIZE = 50

export default function InactiveSearchPage() {
  const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER)
  const [inputUrl, setInputUrl] = useState(DEFAULT_SERVER)
  // 中心座標：預設空白、可打負號；兩格都合格才搜尋（不會拿 0 去搜）
  const mapRadius = useMapRadius()
  const [center, setCenter] = useState<CoordText>(EMPTY_COORD)
  const [showCoordErrors, setShowCoordErrors] = useState(false)
  const centerXY = coordPairValue(center, mapRadius)
  const centerX = centerXY?.x
  const centerY = centerXY?.y
  const [radius, setRadius] = useState(50)
  const [maxPopChange, setMaxPopChange] = useState(2)
  const [results, setResults] = useState<InactiveVillage[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const fetchData = useCallback(async (searchPage: number) => {
    if (centerX == null || centerY == null) {
      setShowCoordErrors(true)
      return
    }
    try {
      setLoading(true)
      setError(null)
      const data = await statisticsApi.searchInactives({
        server_url: serverUrl,
        center_x: centerX,
        center_y: centerY,
        radius,
        max_population_change: maxPopChange,
        page: searchPage,
        page_size: PAGE_SIZE,
      })
      setResults(data.items)
      setTotal(data.total)
      setHasSearched(true)
    } catch {
      setError('無法搜尋不活躍村莊')
    } finally {
      setLoading(false)
    }
  }, [serverUrl, centerX, centerY, radius, maxPopChange])

  const handleSearch = () => {
    setPage(1)
    fetchData(1)
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    fetchData(newPage)
  }

  const handleServerChange = () => {
    setServerUrl(inputUrl)
    setHasSearched(false)
    setResults([])
    setTotal(0)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">不活躍搜尋</h1>

      {/* Server URL input */}
      <div className="flex gap-2 mb-6">
        <Input
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          placeholder="伺服器 URL"
          className="max-w-lg"
          onKeyDown={(e) => e.key === 'Enter' && handleServerChange()}
        />
        <Button variant="outline" onClick={handleServerChange}>
          切換伺服器
        </Button>
      </div>

      {/* Search form */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">搜尋條件</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-end">
            <CoordPair
              className="contents"
              labelClassName="mb-2 block text-sm font-medium leading-none"
              labelX="中心 X"
              labelY="中心 Y"
              testId="inactive-center"
              radius={mapRadius}
              showErrors={showCoordErrors}
              value={center}
              onChange={setCenter}
            />
            <div>
              <Label htmlFor="radius">半徑</Label>
              <Input
                id="radius"
                type="number"
                min={1}
                max={400}
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="maxPopChange">最大人口變化</Label>
              <Input
                id="maxPopChange"
                type="number"
                value={maxPopChange}
                onChange={(e) => setMaxPopChange(Number(e.target.value))}
              />
            </div>
            <div>
              <Button onClick={handleSearch} className="w-full">
                搜尋
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading && <p className="text-center py-8">Loading...</p>}
      {error && <p className="text-center py-8 text-red-500">{error}</p>}

      {!loading && hasSearched && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              搜尋結果 (共 {total.toLocaleString()} 筆)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>村莊</TableHead>
                  <TableHead>座標</TableHead>
                  <TableHead>玩家</TableHead>
                  <TableHead>聯盟</TableHead>
                  <TableHead className="text-right">人口</TableHead>
                  <TableHead className="text-right">7日變化</TableHead>
                  <TableHead className="text-right">村莊數</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((village) => (
                  <TableRow key={village.village_id}>
                    <TableCell className="font-medium">
                      {village.village_name}
                    </TableCell>
                    <TableCell>
                      ({village.x}|{village.y})
                    </TableCell>
                    <TableCell>{village.player_name}</TableCell>
                    <TableCell>{village.alliance_name || '-'}</TableCell>
                    <TableCell className="text-right">
                      {village.population.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={
                          village.population_diff_7d > 0
                            ? 'text-green-600'
                            : village.population_diff_7d < 0
                              ? 'text-red-600'
                              : ''
                        }
                      >
                        {village.population_diff_7d > 0 ? '+' : ''}
                        {village.population_diff_7d}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {village.player_villages}
                    </TableCell>
                  </TableRow>
                ))}
                {results.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      沒有找到符合條件的不活躍村莊
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
                    onClick={() => handlePageChange(page - 1)}
                  >
                    上一頁
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => handlePageChange(page + 1)}
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
