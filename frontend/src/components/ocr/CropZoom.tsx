interface Props {
  src?: string | null
  /** 原圖像素 [x0, y0, x1, y1] */
  box?: number[] | null
  imageWidth?: number
  imageHeight?: number
  /** 顯示高度（px） */
  height?: number
  /** 最寬（px），超過時整體縮小 */
  maxWidth?: number
  /** 框外多留的邊（相對框高） */
  pad?: number
  label?: string
  testId?: string
}

/**
 * 截圖原處放大：用 CSS background 從原圖裁出一塊（不經 canvas，不上傳、不存檔）。
 */
export function CropZoom({
  src,
  box,
  imageWidth,
  imageHeight,
  height = 40,
  maxWidth = 300,
  pad = 0.35,
  label,
  testId = 'ocr-crop',
}: Props) {
  if (!src || !box || box.length < 4 || !imageWidth || !imageHeight) return null
  const [bx0, by0, bx1, by1] = box
  const p = Math.max(2, (by1 - by0) * pad)
  const x0 = Math.max(0, bx0 - p)
  const y0 = Math.max(0, by0 - p)
  const x1 = Math.min(imageWidth, bx1 + p)
  const y1 = Math.min(imageHeight, by1 + p)
  const w = Math.max(1, x1 - x0)
  const h = Math.max(1, y1 - y0)
  let scale = height / h
  if (w * scale > maxWidth) scale = maxWidth / w
  return (
    <div
      role="img"
      aria-label={label}
      data-testid={testId}
      className="rounded-md border border-amber-200 bg-white bg-no-repeat shadow-inner"
      style={{
        width: Math.round(w * scale),
        height: Math.round(h * scale),
        backgroundImage: `url("${src}")`,
        backgroundSize: `${Math.round(imageWidth * scale)}px ${Math.round(imageHeight * scale)}px`,
        backgroundPosition: `${Math.round(-x0 * scale)}px ${Math.round(-y0 * scale)}px`,
      }}
    />
  )
}
