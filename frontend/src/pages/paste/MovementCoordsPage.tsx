import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CoordsCameraButton } from '@/components/ocr/CoordsCameraButton'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useCurrentAccount } from '@/contexts/CurrentAccountContext'
import { pasteApi, type Movement } from '@/services/pasteApi'

export default function MovementCoordsPage() {
  const { movementId } = useParams<{ movementId: string }>()
  const { currentAccount } = useCurrentAccount()
  const navigate = useNavigate()
  const [row, setRow] = useState<Movement | null>(null)
  const [x, setX] = useState('')
  const [y, setY] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!currentAccount || !movementId) return
    void pasteApi.listMovements(currentAccount.account_id).then((res) => {
      const found = res.movements.find((m) => m.movement_id === movementId) || null
      setRow(found)
      if (found?.coordinate_x != null) setX(String(found.coordinate_x))
      if (found?.coordinate_y != null) setY(String(found.coordinate_y))
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
            <Input
              value={x}
              onChange={(e) => setX(e.target.value)}
              placeholder="x"
              inputMode="numeric"
              data-testid="coord-x"
            />
            <Input
              value={y}
              onChange={(e) => setY(e.target.value)}
              placeholder="y"
              inputMode="numeric"
              data-testid="coord-y"
            />
            <CoordsCameraButton
              size="default"
              onPick={(px, py) => {
                setX(String(px))
                setY(String(py))
              }}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Link to="/">
              <Button type="button" variant="outline">取消</Button>
            </Link>
            <Button
              onClick={() => {
                void (async () => {
                  try {
                    await pasteApi.updateCoords(row.movement_id, Number(x), Number(y))
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
