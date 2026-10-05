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
import { useAuth } from '@/contexts/AuthContext'
import {
  statisticsApi,
  type ServerOverview,
  type PlayerRankingItem,
  type AllianceRankingItem,
} from '@/services/statisticsApi'

const DEFAULT_SERVER = 'https://nys.x1.asia.travian.com'

function formatDiff(diff: number): JSX.Element | null {
  if (diff === 0) return null
  const color = diff > 0 ? 'text-green-600' : 'text-red-600'
  const sign = diff > 0 ? '+' : ''
  return <span className={color}>({sign}{diff.toLocaleString()})</span>
}

function StatCard({
  title,
  todayValue,
  yesterdayValue,
}: {
  title: string
  todayValue: number
  yesterdayValue?: number
}) {
  const diff = yesterdayValue !== undefined ? todayValue - yesterdayValue : 0
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold">
          {todayValue.toLocaleString()}{' '}
          {diff !== 0 && formatDiff(diff)}
        </p>
        {yesterdayValue !== undefined && (
          <p className="text-xs text-muted-foreground">
            昨日: {yesterdayValue.toLocaleString()}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export default function ServerOverviewPage() {
  const { isAuthenticated } = useAuth()
  const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER)
  const [inputUrl, setInputUrl] = useState(DEFAULT_SERVER)
  const [overview, setOverview] = useState<ServerOverview | null>(null)
  const [topPlayers, setTopPlayers] = useState<PlayerRankingItem[]>([])
  const [topAlliances, setTopAlliances] = useState<AllianceRankingItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [snapshotMessage, setSnapshotMessage] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [overviewData, playersData, alliancesData] = await Promise.all([
        statisticsApi.getServerOverview(serverUrl),
        statisticsApi.getPlayerRanking({
          server_url: serverUrl,
          sort_by: 'population',
          order: 'desc',
          page: 1,
          page_size: 20,
        }),
        statisticsApi.getAllianceRanking({
          server_url: serverUrl,
          sort_by: 'population',
          order: 'desc',
          page: 1,
          page_size: 20,
        }),
      ])
      setOverview(overviewData)
      setTopPlayers(playersData.items)
      setTopAlliances(alliancesData.items)
    } catch {
      setError('無法載入伺服器資料，請確認伺服器 URL 是否正確')
    } finally {
      setLoading(false)
    }
  }, [serverUrl])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSearch = () => {
    setServerUrl(inputUrl)
  }

  // 手動上傳 map.sql 建立快照（伺服器不會即時連線 Travian；每日抓取由固定排程負責）
  const handleUploadSnapshot = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      setSnapshotMessage(null)
      const result = await statisticsApi.uploadSnapshot(serverUrl, file)
      setSnapshotMessage(result.message)
      fetchData()
    } catch {
      setSnapshotMessage('快照上傳失敗')
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">伺服器總覽</h1>

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
        {isAuthenticated && (
          <Button variant="outline" asChild>
            <label className="cursor-pointer">
              上傳 map.sql 快照
              <input
                type="file"
                accept=".sql,.txt,.gz"
                className="hidden"
                onChange={handleUploadSnapshot}
              />
            </label>
          </Button>
        )}
      </div>

      {snapshotMessage && (
        <p className="text-sm text-green-600 mb-4">{snapshotMessage}</p>
      )}

      {loading && <p className="text-center py-8">Loading...</p>}
      {error && <p className="text-center py-8 text-red-500">{error}</p>}

      {overview && !loading && (
        <>
          {/* Data status */}
          <p className="text-sm text-muted-foreground mb-4">
            資料狀態: {overview.data_status || '未知'}
          </p>

          {/* Stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard
              title="總玩家數"
              todayValue={overview.today.total_players}
              yesterdayValue={overview.yesterday?.total_players}
            />
            <StatCard
              title="活躍玩家"
              todayValue={overview.today.active_players}
              yesterdayValue={overview.yesterday?.active_players}
            />
            <StatCard
              title="新玩家"
              todayValue={overview.today.new_players}
              yesterdayValue={overview.yesterday?.new_players}
            />
            <StatCard
              title="刪號玩家"
              todayValue={overview.today.deleted_players}
              yesterdayValue={overview.yesterday?.deleted_players}
            />
            <StatCard
              title="新建村莊"
              todayValue={overview.today.villages_settled}
              yesterdayValue={overview.yesterday?.villages_settled}
            />
            <StatCard
              title="被毀村莊"
              todayValue={overview.today.villages_destroyed}
              yesterdayValue={overview.yesterday?.villages_destroyed}
            />
            <StatCard
              title="征服數"
              todayValue={overview.today.conquests}
              yesterdayValue={overview.yesterday?.conquests}
            />
            <StatCard
              title="總人口"
              todayValue={overview.today.total_population}
              yesterdayValue={overview.yesterday?.total_population}
            />
          </div>

          {/* TOP-20 Players and Alliances side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* TOP-20 Players */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">TOP-20 玩家</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>玩家</TableHead>
                      <TableHead>聯盟</TableHead>
                      <TableHead className="text-right">人口</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topPlayers.map((player) => (
                      <TableRow key={player.player_id}>
                        <TableCell>{player.rank}</TableCell>
                        <TableCell className="font-medium">
                          {player.player_name}
                        </TableCell>
                        <TableCell>{player.alliance_name || '-'}</TableCell>
                        <TableCell className="text-right">
                          {player.population.toLocaleString()}{' '}
                          {formatDiff(player.population_diff)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {topPlayers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          暫無資料
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* TOP-20 Alliances */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">TOP-20 聯盟</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>聯盟</TableHead>
                      <TableHead className="text-right">成員</TableHead>
                      <TableHead className="text-right">人口</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topAlliances.map((alliance) => (
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
                          {alliance.population.toLocaleString()}{' '}
                          {formatDiff(alliance.population_diff)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {topAlliances.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          暫無資料
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
