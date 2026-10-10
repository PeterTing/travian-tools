import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CoordsCameraButton } from '@/components/ocr/CoordsCameraButton'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import CoordPair from '@/components/common/CoordPair'
import { EMPTY_COORD, coordPairValue, coordText, type CoordText } from '@/lib/coords'
import { useMapRadius } from '@/lib/mapRadius'
import { useCurrentAccount } from '@/contexts/CurrentAccountContext'
import { pasteApi, type Movement } from '@/services/pasteApi'

export default function MovementCoordsPage() {
  const { movementId } = useParams<{ movementId: string }>()
  const { currentAccount } = useCurrentAccount()
  const navigate = useNavigate()
  const [row, setRow] = useState<Movement | null>(null)
  // 預設空白、可打負號；兩格都合格才儲存（不會存成 0）
  const mapRadius = useMapRadius()
  const [coord, setCoord] = useState<CoordText>(EMPTY_COORD)
  const [showCoordErrors, setShowCoordErrors] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!currentAccount || !movementId) return
    void pasteApi.listMovements(currentAccount.account_id).then((res) => {
      const found = res.movements.find((m) => m.movement_id === movementId) || null
      setRow(found)
      if (found?.coordinate_x != null && found?.coordinate_y != null) {
        setCoord(coordText(found.coordinate_x, found.coordinate_y))
      }
    })
  }, [currentAccount, movementId])

  if (!row) {
    return (
      <div className="container mx-auto px-4 py-8 text-center space-y-3">
        <p>找不到這一筆</p>
        <Link to="/">
          <Button type="button" variant="outline">回首頁</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>補座標</CardTitle>
          <p className="text-sm text-muted-foreground">{row.headline || row.role}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-2">
            <CoordPair
              className="grid min-w-0 flex-1 grid-cols-2 gap-2"
              labelClassName="sr-only"
              testId="coord"
              radius={mapRadius}
              showErrors={showCoordErrors}
              value={coord}
              onChange={setCoord}
            />
            <CoordsCameraButton
              size="default"
              beta
              onPick={(px, py) => setCoord(coordText(px, py))}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Link to="/">
              <Button type="button" variant="outline">取消</Button>
            </Link>
            <Button
              onClick={() => {
                const xy = coordPairValue(coord, mapRadius)
                if (!xy) {
                  setShowCoordErrors(true)
                  return
                }
                void (async () => {
                  try {
                    await pasteApi.updateCoords(row.movement_id, xy.x, xy.y)
                    navigate('/')
                  } catch (e) {
                    setError(e instanceof Error ? e.message : '儲存失敗')
                  }
                })()
              }}
            >
              儲存
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
