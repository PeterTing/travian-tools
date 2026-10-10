import { forwardRef, useEffect, useState, type InputHTMLAttributes } from 'react'
import { formatThousands, parseLooseInteger } from '@/lib/numberInput'

type NativeProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'inputMode'>

interface NumberInputProps extends NativeProps {
  /** NaN＝空白 */
  value: number
  onChange: (value: number) => void
}

/**
 * 非負整數欄位（大數字用，例如每次掠奪量）：
 * - 打字時照打（可以打「,」），每打一個字就把數字回傳；空白回傳 NaN，不補 0。
 * - 離開欄位時去掉前面的 0、加上千分位：「01000000」→「1,000,000」。
 * - type="text"＋inputMode="numeric"：手機跳數字鍵盤；type="number" 不能顯示千分位。
 */
const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(function NumberInput(
  { value, onChange, onBlur, onFocus, ...rest },
  ref,
) {
  const [text, setText] = useState(() => formatThousands(value))
  const [focused, setFocused] = useState(false)

  // 外面改了值（例如換兵種、重設）而且不是正在打字：顯示格式化後的值
  useEffect(() => {
    if (!focused) setText(formatThousands(value))
  }, [value, focused])

  return (
    <input
      {...rest}
      ref={ref}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={text}
      onFocus={(e) => {
        setFocused(true)
        onFocus?.(e)
      }}
      onChange={(e) => {
        const raw = e.target.value
        setText(raw)
        onChange(parseLooseInteger(raw))
      }}
      onBlur={(e) => {
        setFocused(false)
        const n = parseLooseInteger(text)
        setText(formatThousands(n))
        onBlur?.(e)
      }}
    />
  )
})

export default NumberInput
