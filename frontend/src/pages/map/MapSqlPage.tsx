import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { gameAccountApi } from '@/services/gameAccountApi'
import { mapSqlApi, type MapParseResponse, type MapVillage, type MapPlayer, type MapAlliance } from '@/services/mapSqlApi'
import type { GameAccount } from '@/types/game'

type ViewMode = 'villages' | 'players' | 'alliances'
type SearchMode = 'range' | 'player' | 'alliance'

export default function MapSqlPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  // State
  const [accounts, setAccounts] = useState<GameAccount[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [sqlContent, setSqlContent] = useState<string>('')
  const [parseResult, setParseResult] = useState<MapParseResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('villages')

  // Search state
  const [searchMode, setSearchMode] = useState<SearchMode>('range')
  const [searchPlayerName, setSearchPlayerName] = useState('')
  const [searchAllianceName, setSearchAllianceName] = useState('')
  const [centerX, setCenterX] = useState<number>(0)
  const [centerY, setCenterY] = useState<number>(0)
  const [radius, setRadius] = useState<number>(20)
  const [searchResults, setSearchResults] = useState<MapVillage[] | MapPlayer[] | MapAlliance[] | null>(null)

  useEffect(() => {
    loadAccounts()
  }, [])

  const loadAccounts = async () => {
    try {
      const response = await gameAccountApi.getAll(true)
      setAccounts(response.accounts)
      if (response.accounts.length > 0) {
        setSelectedAccountId(response.accounts[0].account_id)
      }
    } catch (err) {
      console.error('Failed to load accounts:', err)
    }
  }

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setSelectedFile(file)
    setParseResult(null)
    setSearchResults(null)
    setError(null)
    setSuccess(null)
    try {
      // map.sql.gz 在瀏覽器端解壓以便預覽解析；儲存時直接把原檔上傳給後端
      const content =
        file.name.endsWith('.gz') && typeof DecompressionStream !== 'undefined'
          ? await new Response(
              file.stream().pipeThrough(new DecompressionStream('gzip')),
            ).text()
          : file.name.endsWith('.gz')
            ? ''
            : await file.text()
      setSqlContent(content)
    } catch (err) {
      console.error('Failed to read file:', err)
      setSqlContent('')
      setError(t('mapSql.parseError'))
    }
  }, [t])

  const handleParse = async () => {
    if (!sqlContent.trim()) {
      setError(t('mapSql.noContent'))
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const result = await mapSqlApi.parse(sqlContent)
      setParseResult(result)
      setSuccess(t('mapSql.parseSuccess', {
        villages: result.total_villages,
        players: result.total_players,
        alliances: result.total_alliances
      }))
    } catch (err) {
      console.error('Parse error:', err)
      setError(t('mapSql.parseError'))
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!selectedFile || !selectedAccountId) {
      setError(t('mapSql.selectAccountFirst'))
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const result = await mapSqlApi.upload(selectedAccountId, selectedFile)
      if (result.success) {
        setSuccess(result.message)
      } else {
        setError(result.message)
      }
    } catch (err) {
      console.error('Save error:', err)
      setError(t('mapSql.saveError'))
    } finally {
      setSaving(false)
    }
  }

  // 計算兩點之間的距離
  const calcDistance = (x1: number, y1: number, x2: number, y2: number) => {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
  }

  const handleSearch = () => {
    // 如果有已解析的結果，在本地進行搜尋
    if (parseResult) {
      let results: MapVillage[] | MapPlayer[] | MapAlliance[]
      switch (searchMode) {
        case 'range':
          // 篩選範圍內的村莊並按距離排序
          results = parseResult.villages
            .filter(v =>
              Math.abs(v.x - centerX) <= radius && Math.abs(v.y - centerY) <= radius
            )
            .sort((a, b) =>
              calcDistance(centerX, centerY, a.x, a.y) - calcDistance(centerX, centerY, b.x, b.y)
            )
          break
        case 'player':
          results = parseResult.players.filter(p =>
            p.player_name.toLowerCase().includes(searchPlayerName.toLowerCase())
          )
          break
        case 'alliance':
          results = parseResult.alliances.filter(a =>
            a.alliance_name.toLowerCase().includes(searchAllianceName.toLowerCase())
          )
          break
      }
      setSearchResults(results)
      return
    }

    // 否則需要先解析
    setError(t('mapSql.parseFirst'))
  }

  // 取得選中帳號的伺服器網址
  const getServerUrl = () => {
    const account = accounts.find(a => a.account_id === selectedAccountId)
    return account?.server_url?.replace(/\/$/, '') || ''
  }

  const renderVillagesTable = (villages: MapVillage[], showDistance = false) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('mapSql.coordinates')}</TableHead>
          {showDistance && <TableHead className="text-right">{t('mapSql.distance')}</TableHead>}
          <TableHead>{t('mapSql.villageName')}</TableHead>
          <TableHead>{t('mapSql.playerName')}</TableHead>
          <TableHead>{t('mapSql.allianceName')}</TableHead>
          <TableHead className="text-right">{t('mapSql.population')}</TableHead>
          <TableHead>{t('mapSql.actions')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {villages.slice(0, 100).map((v, i) => {
          const serverUrl = getServerUrl()
          const distance = showDistance ? calcDistance(centerX, centerY, v.x, v.y) : 0
          return (
          <TableRow key={i}>
            <TableCell>({v.x}, {v.y})</TableCell>
            {showDistance && <TableCell className="text-right">{distance.toFixed(1)}</TableCell>}
            <TableCell>{v.village_name || '-'}</TableCell>
            <TableCell>{v.player_name || '-'}</TableCell>
            <TableCell>{v.alliance_name || '-'}</TableCell>
            <TableCell className="text-right">{v.population}</TableCell>
            <TableCell>
              {serverUrl && v.x !== undefined && v.y !== undefined && (
                <a
                  href={`${serverUrl}/position_details.php?x=${v.x}&y=${v.y}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm"
                >
                  {t('mapSql.viewOnMap')}
                </a>
              )}
            </TableCell>
          </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )

  const renderPlayersTable = (players: MapPlayer[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('mapSql.playerName')}</TableHead>
          <TableHead>{t('mapSql.allianceName')}</TableHead>
          <TableHead className="text-right">{t('mapSql.villageCount')}</TableHead>
          <TableHead className="text-right">{t('mapSql.totalPopulation')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {players.slice(0, 100).map((p, i) => (
          <TableRow key={i}>
            <TableCell>{p.player_name}</TableCell>
            <TableCell>{p.alliance_name || '-'}</TableCell>
            <TableCell className="text-right">{p.village_count}</TableCell>
            <TableCell className="text-right">{p.total_population}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )

  const renderAlliancesTable = (alliances: MapAlliance[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('mapSql.allianceName')}</TableHead>
          <TableHead className="text-right">{t('mapSql.memberCount')}</TableHead>
          <TableHead className="text-right">{t('mapSql.totalPopulation')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {alliances.slice(0, 100).map((a, i) => (
          <TableRow key={i}>
            <TableCell>{a.alliance_name}</TableCell>
            <TableCell className="text-right">{a.member_count}</TableCell>
            <TableCell className="text-right">{a.total_population}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )

  if (accounts.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">{t('mapSql.noAccounts')}</p>
            <Button onClick={() => navigate('/game-accounts')}>
              {t('mapSql.goToAccounts')}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t('mapSql.title')}</h1>
        <p className="text-muted-foreground">{t('mapSql.description')}</p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>{t('common.error')}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-4">
          <AlertTitle>{t('common.success')}</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Account + daily public map.sql fetch */}
        <Card>
          <CardHeader>
            <CardTitle>{t('mapSql.dailyFetchTitle')}</CardTitle>
            <CardDescription>{t('mapSql.dailyFetchDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="account">{t('mapSql.selectAccount')}</Label>
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={t('mapSql.selectAccountPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.account_id} value={account.account_id}>
                      {account.player_name || account.server_name || account.server_url}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedAccountId && (
              <div className="text-sm text-muted-foreground">
                {t('mapSql.serverUrl')}: {accounts.find(a => a.account_id === selectedAccountId)?.server_url || t('mapSql.notSet')}
              </div>
            )}

            <p className="text-sm text-muted-foreground">{t('mapSql.dailyFetchSchedule')}</p>
          </CardContent>
        </Card>

        {/* Manual Upload Card */}
        <Card>
          <CardHeader>
            <CardTitle>{t('mapSql.uploadTitle')}</CardTitle>
            <CardDescription>{t('mapSql.uploadDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="file">{t('mapSql.selectFile')}</Label>
              <Input
                id="file"
                type="file"
                accept=".sql,.txt,.gz"
                onChange={handleFileUpload}
                className="mt-1"
              />
            </div>

            {sqlContent && (
              <div className="text-sm text-muted-foreground">
                {t('mapSql.fileLoaded', { size: (sqlContent.length / 1024).toFixed(1) })}
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleParse} disabled={loading || !sqlContent}>
                {loading ? t('common.loading') : t('mapSql.parse')}
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !selectedFile || !selectedAccountId}
                variant="secondary"
              >
                {saving ? t('common.loading') : t('mapSql.saveToDb')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Search Card */}
        <Card>
          <CardHeader>
            <CardTitle>{t('mapSql.searchTitle')}</CardTitle>
            <CardDescription>{t('mapSql.searchDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>{t('mapSql.searchMode')}</Label>
              <Select value={searchMode} onValueChange={(v) => setSearchMode(v as SearchMode)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="range">{t('mapSql.searchByRange')}</SelectItem>
                  <SelectItem value="player">{t('mapSql.searchByPlayer')}</SelectItem>
                  <SelectItem value="alliance">{t('mapSql.searchByAlliance')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {searchMode === 'range' && (
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label>X</Label>
                  <Input
                    type="number"
                    value={centerX}
                    onChange={(e) => setCenterX(parseInt(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Y</Label>
                  <Input
                    type="number"
                    value={centerY}
                    onChange={(e) => setCenterY(parseInt(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>{t('mapSql.radius')}</Label>
                  <Input
                    type="number"
                    value={radius}
                    onChange={(e) => setRadius(parseInt(e.target.value) || 20)}
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            {searchMode === 'player' && (
              <div>
                <Label>{t('mapSql.playerName')}</Label>
                <Input
                  value={searchPlayerName}
                  onChange={(e) => setSearchPlayerName(e.target.value)}
                  placeholder={t('mapSql.playerNamePlaceholder')}
                  className="mt-1"
                />
              </div>
            )}

            {searchMode === 'alliance' && (
              <div>
                <Label>{t('mapSql.allianceName')}</Label>
                <Input
                  value={searchAllianceName}
                  onChange={(e) => setSearchAllianceName(e.target.value)}
                  placeholder={t('mapSql.allianceNamePlaceholder')}
                  className="mt-1"
                />
              </div>
            )}

            <Button onClick={handleSearch} disabled={loading || !parseResult}>
              {t('mapSql.search')}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      {(parseResult || searchResults) && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t('mapSql.results')}</CardTitle>
              {parseResult && !searchResults && (
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === 'villages' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('villages')}
                  >
                    {t('mapSql.villages')} ({parseResult.total_villages})
                  </Button>
                  <Button
                    variant={viewMode === 'players' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('players')}
                  >
                    {t('mapSql.players')} ({parseResult.total_players})
                  </Button>
                  <Button
                    variant={viewMode === 'alliances' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('alliances')}
                  >
                    {t('mapSql.alliances')} ({parseResult.total_alliances})
                  </Button>
                </div>
              )}
            </div>
            {searchResults && (
              <CardDescription>
                {t('mapSql.searchResultsCount', { count: searchResults.length })}
                <Button variant="link" size="sm" onClick={() => setSearchResults(null)}>
                  {t('mapSql.clearSearch')}
                </Button>
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              {searchResults ? (
                searchMode === 'range' ? renderVillagesTable(searchResults as MapVillage[], true) :
                searchMode === 'player' ? renderPlayersTable(searchResults as MapPlayer[]) :
                renderAlliancesTable(searchResults as MapAlliance[])
              ) : parseResult && (
                viewMode === 'villages' ? renderVillagesTable(parseResult.villages, false) :
                viewMode === 'players' ? renderPlayersTable(parseResult.players) :
                renderAlliancesTable(parseResult.alliances)
              )}
            </div>
            {((parseResult && viewMode === 'villages' && parseResult.total_villages > 100) ||
              (searchResults && searchResults.length > 100)) && (
              <p className="text-sm text-muted-foreground mt-4 text-center">
                {t('mapSql.showingFirst100')}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
